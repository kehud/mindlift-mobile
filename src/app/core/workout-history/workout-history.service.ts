import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  collection,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Capacitor } from '@capacitor/core';

import { AuthService } from '../auth/auth.service';
import type { WorkoutSession } from '../workout-session/workout-session.model';

type WorkoutHistoryDocument = Pick<
  WorkoutSession,
  | 'workoutType'
  | 'durationMinutes'
  | 'coachingTone'
  | 'mainGoal'
  | 'startedAt'
  | 'actualDurationSeconds'
  | 'completedAt'
  | 'completionReason'
  | 'status'
> & {
  timelineId: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  updatedAt: ReturnType<typeof serverTimestamp>;
};

type StoredWorkoutHistoryDocument = Omit<
  WorkoutHistoryDocument,
  'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'
> & {
  startedAt: unknown;
  completedAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
};

export interface WorkoutHistoryEntry {
  id: string;
  workoutType: WorkoutSession['workoutType'];
  durationMinutes: WorkoutSession['durationMinutes'];
  coachingTone: WorkoutSession['coachingTone'];
  mainGoal: string;
  startedAt: Date | null;
  actualDurationSeconds: number | null;
  completedAt: Date | null;
  completionReason: WorkoutSession['completionReason'];
  status: WorkoutSession['status'];
  timelineId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

@Injectable({
  providedIn: 'root',
})
export class WorkoutHistoryService {
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly isNativePlatform = Capacitor.isNativePlatform();

  async saveCompletedWorkout(session: WorkoutSession, uid?: string): Promise<void> {
    if (session.status !== 'completed') {
      return;
    }

    try {
      const workoutUid = this.resolveUid(uid);
      const timestamp = new Date();

      if (this.isNativePlatform) {
        await FirebaseFirestore.setDocument({
          reference: this.workoutPath(workoutUid, session.timeline.id),
          data: {
            ...this.toWorkoutData(session),
            startedAt: session.startedAt.toISOString(),
            completedAt: session.completedAt?.toISOString() ?? null,
            createdAt: timestamp.toISOString(),
            updatedAt: timestamp.toISOString(),
          },
          merge: true,
        });
        return;
      }

      const firestoreTimestamp = serverTimestamp();
      const workout: WorkoutHistoryDocument = {
        ...this.toWorkoutData(session),
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        createdAt: firestoreTimestamp,
        updatedAt: firestoreTimestamp,
      };

      await setDoc(
        this.workoutRef(workoutUid, session.timeline.id),
        workout,
        { merge: true },
      );
    } catch (error) {
      console.error('Failed to save completed workout.', this.getErrorDetails(error));
      throw error;
    }
  }

  async loadCompletedWorkouts(uid?: string): Promise<WorkoutHistoryEntry[]> {
    try {
      const workoutUid = this.resolveUid(uid);

      if (this.isNativePlatform) {
        const { snapshots } = await FirebaseFirestore.getCollection<StoredWorkoutHistoryDocument>({
          reference: this.workoutsPath(workoutUid),
          queryConstraints: [{
            type: 'orderBy',
            fieldPath: 'completedAt',
            directionStr: 'desc',
          }],
        });

        const workouts: WorkoutHistoryEntry[] = [];

        for (const snapshot of snapshots) {
          if (!snapshot.data) {
            continue;
          }

          workouts.push(this.toWorkoutHistoryEntry(snapshot.id, snapshot.data));
        }

        return this.sortByCompletedAt(workouts);
      }

      const workoutsQuery = query(
        collection(this.firestore, 'users', workoutUid, 'workouts'),
        orderBy('completedAt', 'desc'),
      );
      const snapshots = await getDocs(workoutsQuery);

      return this.sortByCompletedAt(snapshots.docs.map((snapshot) =>
        this.toWorkoutHistoryEntry(snapshot.id, snapshot.data() as StoredWorkoutHistoryDocument),
      ));
    } catch (error) {
      console.error('Failed to load completed workouts.', this.getErrorDetails(error));
      throw error;
    }
  }

  async loadCompletedWorkoutById(
    workoutId: string,
    uid?: string,
  ): Promise<WorkoutHistoryEntry | null> {
    try {
      const workoutUid = this.resolveUid(uid);

      if (this.isNativePlatform) {
        const { snapshot } = await FirebaseFirestore.getDocument<StoredWorkoutHistoryDocument>({
          reference: this.workoutPath(workoutUid, workoutId),
        });

        return snapshot.data
          ? this.toWorkoutHistoryEntry(snapshot.id, snapshot.data)
          : null;
      }

      const snapshot = await getDoc(this.workoutRef(workoutUid, workoutId));

      return snapshot.exists()
        ? this.toWorkoutHistoryEntry(snapshot.id, snapshot.data() as StoredWorkoutHistoryDocument)
        : null;
    } catch (error) {
      console.error('Failed to load completed workout.', this.getErrorDetails(error));
      throw error;
    }
  }

  private toWorkoutData(
    session: WorkoutSession,
  ): Omit<WorkoutHistoryDocument, 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'> {
    return {
      workoutType: session.workoutType,
      durationMinutes: session.durationMinutes,
      coachingTone: session.coachingTone,
      mainGoal: session.mainGoal,
      actualDurationSeconds: session.actualDurationSeconds,
      completionReason: session.completionReason,
      status: session.status,
      timelineId: session.timeline.id,
    };
  }

  private workoutRef(uid: string, workoutId: string): DocumentReference<WorkoutHistoryDocument> {
    return doc(
      this.firestore,
      'users',
      uid,
      'workouts',
      workoutId,
    ) as DocumentReference<WorkoutHistoryDocument>;
  }

  private workoutPath(uid: string, workoutId: string): string {
    return `users/${uid}/workouts/${workoutId}`;
  }

  private workoutsPath(uid: string): string {
    return `users/${uid}/workouts`;
  }

  private toWorkoutHistoryEntry(
    id: string,
    data: StoredWorkoutHistoryDocument,
  ): WorkoutHistoryEntry {
    return {
      id,
      workoutType: data.workoutType,
      durationMinutes: data.durationMinutes,
      coachingTone: data.coachingTone,
      mainGoal: data.mainGoal,
      startedAt: this.toDate(data.startedAt),
      actualDurationSeconds: data.actualDurationSeconds,
      completedAt: this.toDate(data.completedAt),
      completionReason: data.completionReason,
      status: data.status,
      timelineId: data.timelineId,
      createdAt: this.toDate(data.createdAt),
      updatedAt: this.toDate(data.updatedAt),
    };
  }

  private sortByCompletedAt(workouts: WorkoutHistoryEntry[]): WorkoutHistoryEntry[] {
    return workouts.sort((first, second) =>
      (second.completedAt?.getTime() ?? 0) - (first.completedAt?.getTime() ?? 0),
    );
  }

  private toDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const date = new Date(value);

      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (value && typeof value === 'object' && 'toDate' in value) {
      const timestamp = value as { toDate?: unknown };

      if (typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();

        return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
      }
    }

    return null;
  }

  private resolveUid(uid?: string): string {
    const resolvedUid = uid ?? (this.isNativePlatform
      ? this.authService.getCurrentUser()?.uid
      : this.auth.currentUser?.uid);

    if (!resolvedUid) {
      throw new Error('Cannot save completed workout without an authenticated user.');
    }

    return resolvedUid;
  }

  private getErrorDetails(error: unknown): { code: string | null; message: string } {
    const firestoreError = error as { code?: unknown; message?: unknown };

    return {
      code: typeof firestoreError.code === 'string' ? firestoreError.code : null,
      message: typeof firestoreError.message === 'string'
        ? firestoreError.message
        : 'Unknown Firestore error.',
    };
  }
}
