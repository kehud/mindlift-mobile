import { effect, inject, Injectable, OnDestroy } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import type { MindLiftLanguage } from '../i18n/language-direction.service';
import type { WorkoutEngineRuntimeSnapshot } from '../workout-engine/models/workout-engine-runtime.models';
import { WorkoutAudioAdapter } from '../workout-engine/workout-audio.adapter';
import { WorkoutContentService } from '../workout-engine/workout-content.service';
import { WorkoutEngineService } from '../workout-engine/workout-engine.service';
import type { WorkoutStep, WorkoutTimeline } from '../workout-engine/models/workout-timeline.models';
import { generateWorkoutTimeline } from '../workout-engine/workout-timeline-generator';
import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import type { WorkoutSetup } from '../workout-setup/workout-setup.model';
import {
  isCoachingTone,
  isWorkoutDuration,
  isWorkoutType,
} from '../workout-setup/workout-setup-options';
import { MindLiftLiveActivity } from './mindlift-live-activity';
import { WorkoutHapticsService } from './workout-haptics.service';
import type { WorkoutSession } from './workout-session.model';

// MVP workout content is Hebrew independently of the application UI language.
const MVP_WORKOUT_CONTENT_LANGUAGE: MindLiftLanguage = 'he';
const ACTIVE_WORKOUT_SESSION_PREFERENCES_KEY = 'activeWorkoutSession';

type PersistedWorkoutEngineStatus = 'running' | 'paused' | 'boosting';

interface PersistedWorkoutSession {
  version: 1;
  persistedAt: string;
  engineStatus: PersistedWorkoutEngineStatus;
  elapsedSeconds: number;
  liveActivityId: string | null;
  session: WorkoutSession;
}

@Injectable({
  providedIn: 'root',
})
export class WorkoutSessionService implements OnDestroy {
  private readonly workoutAudio = inject(WorkoutAudioAdapter);
  private readonly workoutContent = inject(WorkoutContentService);
  private readonly workoutEngine = inject(WorkoutEngineService);
  private readonly workoutHaptics = inject(WorkoutHapticsService);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);

  private currentSession: WorkoutSession | null = null;
  private handledCueEventCount = 0;
  private liveActivityId: string | null = null;
  private liveActivityStartPromise: Promise<string | null> | null = null;
  private lastLiveActivityUpdateKey: string | null = null;
  private completedLiveActivityId: string | null = null;
  private liveActivityMayExist = false;
  private lastSessionPersistenceKey: string | null = null;
  private sessionPersistenceWrite = Promise.resolve();

  private readonly presentedCueAudioEffect = effect(() => {
    const cueEvents = this.workoutEngine.cueEvents();
    const status = this.workoutEngine.snapshot()?.status;
    const session = this.currentSession;

    if (!session || !status || status === 'idle') {
      this.workoutAudio.stop();
      this.handledCueEventCount = cueEvents.length;
      return;
    }

    if (status === 'completed') {
      this.applyCompletedEngineSnapshot(this.workoutEngine.getSnapshot());
      this.workoutAudio.stop();
      this.handledCueEventCount = cueEvents.length;
      return;
    }

    if (status === 'paused') {
      this.workoutAudio.pause();
    } else {
      this.workoutAudio.resume();
    }

    for (const event of cueEvents.slice(this.handledCueEventCount)) {
      if (event.type !== 'cue-presented') {
        continue;
      }

      const cue = session.timeline.cues.find((candidate) => candidate.id === event.cueId);

      if (!cue) {
        continue;
      }

      const audio = cue.audioId
        ? session.timeline.audio.find((candidate) => candidate.id === cue.audioId)
        : undefined;

      this.workoutAudio.handlePresentedCue(cue, audio);
    }

    this.handledCueEventCount = cueEvents.length;
  });

  private readonly liveActivityUpdateEffect = effect(() => {
    const snapshot = this.workoutEngine.snapshot();
    const session = this.currentSession;

    if (
      Capacitor.getPlatform() !== 'ios'
      || !session
      || !this.liveActivityMayExist
      || !snapshot
      || (snapshot.status !== 'running' && snapshot.status !== 'paused' && snapshot.status !== 'boosting')
    ) {
      return;
    }

    void this.updateLiveActivity(session, snapshot);
  });

  private readonly activeSessionPersistenceEffect = effect(() => {
    const snapshot = this.workoutEngine.snapshot();
    const session = this.currentSession;

    if (
      !session
      || session.status !== 'active'
      || !snapshot
      || (snapshot.status !== 'running' && snapshot.status !== 'paused' && snapshot.status !== 'boosting')
    ) {
      return;
    }

    this.persistActiveSession(session, snapshot);
  });

  getCurrentSession(): WorkoutSession | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      ...this.currentSession,
      startedAt: new Date(this.currentSession.startedAt),
      completedAt: this.currentSession.completedAt
        ? new Date(this.currentSession.completedAt)
        : null,
    };
  }

  async initializeFromSetup(): Promise<WorkoutSession | null> {
    if (this.currentSession?.status === 'active') {
      return this.getCurrentSession();
    }

    await this.workoutSetupState.prefillFromOnboardingProfile();

    if (!this.workoutSetupState.isCompleteSetup()) {
      this.currentSession = null;
      return null;
    }

    const setup = this.workoutSetupState.getSnapshot();
    const startedAt = new Date();

    this.currentSession = {
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      coachingTone: setup.coachingTone!,
      mainGoal: setup.mainGoal!,
      timeline: this.generateTimelineFromSetup(setup, startedAt),
      startedAt,
      actualDurationSeconds: null,
      completedAt: null,
      completionReason: null,
      status: 'active',
    };

    this.workoutAudio.reset();
    this.handledCueEventCount = 0;
    this.workoutEngine.initialize(this.currentSession.timeline);
    this.workoutEngine.start();
    void this.startLiveActivityForCurrentSession(this.currentSession);
    void this.workoutHaptics.workoutStarted();

    return this.getCurrentSession();
  }

  completeCurrentSession(): WorkoutSession | null {
    if (!this.currentSession) {
      return null;
    }

    let engineSnapshot = this.workoutEngine.getSnapshot();

    if (engineSnapshot?.status !== 'completed') {
      this.workoutEngine.complete('ended_by_user');
      engineSnapshot = this.workoutEngine.getSnapshot();
    }

    if (!this.applyCompletedEngineSnapshot(engineSnapshot)) {
      return this.getCurrentSession();
    }

    return this.getCurrentSession();
  }

  clearSession(): void {
    this.workoutAudio.reset();
    this.handledCueEventCount = 0;
    this.currentSession = null;
    this.workoutEngine.reset();
    this.clearPersistedActiveSession();
  }

  async dismissLiveActivity(): Promise<void> {
    const activityId = this.liveActivityId ?? undefined;

    if (Capacitor.getPlatform() !== 'ios' || (!activityId && !this.liveActivityMayExist)) {
      this.resetLiveActivityTracking();
      return;
    }

    try {
      await MindLiftLiveActivity.end(activityId ? { activityId } : {});
    } catch (error: unknown) {
      console.error('Failed to end MindLift Live Activity.', error);
    } finally {
      this.resetLiveActivityTracking();
    }
  }

  ngOnDestroy(): void {
    this.presentedCueAudioEffect.destroy();
    this.liveActivityUpdateEffect.destroy();
    this.activeSessionPersistenceEffect.destroy();
    this.workoutAudio.reset();
  }

  async restorePersistedActiveSession(): Promise<boolean> {
    if (this.currentSession?.status === 'active') {
      return true;
    }

    const persisted = await this.loadPersistedActiveSession();

    if (!persisted) {
      return false;
    }

    const restoredAt = new Date();
    const persistedAt = new Date(persisted.persistedAt);
    const timelineDurationSeconds = Math.max(Math.floor(persisted.session.timeline.totalDurationSeconds), 0);

    if (Number.isNaN(persistedAt.getTime()) || timelineDurationSeconds <= 0) {
      await this.removePersistedActiveSession();
      return false;
    }

    const elapsedSeconds = persisted.engineStatus === 'paused'
      ? persisted.elapsedSeconds
      : persisted.elapsedSeconds + Math.max(Math.floor((restoredAt.getTime() - persistedAt.getTime()) / 1000), 0);
    const clampedElapsedSeconds = Math.min(Math.max(elapsedSeconds, 0), timelineDurationSeconds);

    if (clampedElapsedSeconds >= timelineDurationSeconds) {
      await this.removePersistedActiveSession();
      return false;
    }

    this.currentSession = persisted.session;
    this.handledCueEventCount = 0;
    this.liveActivityId = persisted.liveActivityId;
    this.liveActivityMayExist = true;
    this.completedLiveActivityId = null;
    this.lastLiveActivityUpdateKey = null;
    this.workoutAudio.reset();
    this.workoutEngine.restore(this.currentSession.timeline, {
      status: persisted.engineStatus === 'paused' ? 'paused' : 'running',
      elapsedSeconds: clampedElapsedSeconds,
      restoredAt,
    });

    const snapshot = this.workoutEngine.getSnapshot();
    if (snapshot) {
      await this.updateLiveActivity(this.currentSession, snapshot);
    }

    return true;
  }

  private applyCompletedEngineSnapshot(engineSnapshot: WorkoutEngineRuntimeSnapshot | null): boolean {
    if (!this.currentSession || !engineSnapshot || engineSnapshot.status !== 'completed') {
      return false;
    }

    const wasCompleted = this.currentSession.status === 'completed';
    this.workoutAudio.stop();
    this.currentSession = {
      ...this.currentSession,
      actualDurationSeconds: engineSnapshot.elapsedSeconds,
      completedAt: engineSnapshot.completedAt,
      completionReason: engineSnapshot.completionReason,
      status: 'completed',
    };

    if (!wasCompleted) {
      void this.workoutHaptics.workoutCompleted();
      void this.completeLiveActivity(engineSnapshot);
      this.clearPersistedActiveSession();
    }

    return true;
  }

  private generateTimelineFromSetup(setup: WorkoutSetup, startedAt: Date): WorkoutTimeline {
    return generateWorkoutTimeline({
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      plannedDurationSeconds: setup.durationMinutes! * 60,
      coachingTone: setup.coachingTone!,
      language: MVP_WORKOUT_CONTENT_LANGUAGE,
      mainGoal: setup.mainGoal!,
      createdAt: startedAt,
    }, this.workoutContent.getCueTemplates());
  }

  private async startLiveActivityForCurrentSession(session: WorkoutSession): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios' || this.liveActivityMayExist || this.liveActivityStartPromise) {
      return;
    }

    const snapshot = this.workoutEngine.getSnapshot();
    const state = snapshot
      ? this.getLiveActivityState(session, snapshot)
      : {
          workoutStage: 'Warm-up',
          elapsedSeconds: 0,
          remainingSeconds: session.timeline.totalDurationSeconds,
          progress: 0,
          isTimerRunning: false,
        };

    this.liveActivityStartPromise = MindLiftLiveActivity.start({
      workoutTitle: session.timeline.title,
      ...state,
      status: 'active',
    })
      .then((result) => result.activityId)
      .catch((error: unknown) => {
        console.error('Failed to start MindLift Live Activity.', error);
        return null;
      });

    this.liveActivityId = await this.liveActivityStartPromise;
    this.liveActivityMayExist = this.liveActivityId !== null;
    this.liveActivityStartPromise = null;
    this.persistActiveSessionFromCurrentSnapshot();

    const latestSnapshot = this.workoutEngine.getSnapshot();
    if (this.liveActivityId) {
      this.lastLiveActivityUpdateKey = this.getLiveActivityUpdateKey(this.liveActivityId, state);
    }

    if (this.liveActivityId && latestSnapshot?.status === 'completed') {
      await this.completeLiveActivity(latestSnapshot);
      return;
    }

    if (this.liveActivityId && latestSnapshot) {
      await this.updateLiveActivity(session, latestSnapshot);
    }
  }

  private async updateLiveActivity(
    session: WorkoutSession,
    snapshot: WorkoutEngineRuntimeSnapshot,
  ): Promise<void> {
    const activityId = this.liveActivityId;

    if (!activityId && !this.liveActivityMayExist) {
      return;
    }

    const state = this.getLiveActivityState(session, snapshot);
    const updateKey = this.getLiveActivityUpdateKey(activityId ?? 'existing-live-activity', state);

    if (updateKey === this.lastLiveActivityUpdateKey) {
      return;
    }

    this.lastLiveActivityUpdateKey = updateKey;

    try {
      const result = await MindLiftLiveActivity.update({
        ...(activityId ? { activityId } : {}),
        ...state,
        status: 'active',
      });
      this.liveActivityId = result.activityId;
      this.liveActivityMayExist = true;
      this.persistActiveSessionFromCurrentSnapshot();
    } catch (error: unknown) {
      console.error('Failed to update MindLift Live Activity.', error);
    }
  }

  private async completeLiveActivity(snapshot: WorkoutEngineRuntimeSnapshot): Promise<void> {
    const activityId = this.liveActivityId;

    if (
      Capacitor.getPlatform() !== 'ios'
      || (!activityId && !this.liveActivityMayExist)
      || (activityId !== null && this.completedLiveActivityId === activityId)
    ) {
      return;
    }

    const elapsedSeconds = snapshot.elapsedSeconds;
    this.completedLiveActivityId = activityId ?? 'existing-live-activity';
    this.lastLiveActivityUpdateKey = [
      activityId ?? 'existing-live-activity',
      'completed',
      elapsedSeconds,
    ].join('|');

    try {
      const result = await MindLiftLiveActivity.update({
        ...(activityId ? { activityId } : {}),
        workoutStage: 'Workout Complete',
        elapsedSeconds,
        remainingSeconds: 0,
        progress: 1,
        isTimerRunning: false,
        status: 'completed',
      });
      this.liveActivityId = result.activityId;
      this.liveActivityMayExist = true;
      this.completedLiveActivityId = result.activityId;
    } catch (error: unknown) {
      this.completedLiveActivityId = null;
      console.error('Failed to complete MindLift Live Activity.', error);
    }
  }

  private getLiveActivityState(
    session: WorkoutSession,
    snapshot: WorkoutEngineRuntimeSnapshot,
  ): {
    workoutStage: string;
    elapsedSeconds: number;
    remainingSeconds: number;
    progress: number;
    timerStartedAt?: string;
    timerEndsAt?: string;
    isTimerRunning: boolean;
  } {
    const totalSeconds = session.timeline.totalDurationSeconds;
    const elapsedSeconds = snapshot.elapsedSeconds;
    const activeStep = this.getActiveTimelineStep(session, snapshot);
    const isTimerRunning = snapshot.status === 'running' || snapshot.status === 'boosting';
    const now = new Date();

    const state = {
      workoutStage: activeStep?.type === 'warmup' ? 'Warm-up' : 'Workout',
      elapsedSeconds,
      remainingSeconds: snapshot.remainingSeconds,
      progress: totalSeconds > 0 ? Math.min(Math.max(elapsedSeconds / totalSeconds, 0), 1) : 0,
      isTimerRunning,
    };

    if (!isTimerRunning) {
      return state;
    }

    return {
      ...state,
      timerStartedAt: new Date(now.getTime() - (elapsedSeconds * 1000)).toISOString(),
      timerEndsAt: new Date(now.getTime() + (snapshot.remainingSeconds * 1000)).toISOString(),
    };
  }

  private getActiveTimelineStep(
    session: WorkoutSession,
    snapshot: WorkoutEngineRuntimeSnapshot,
  ): WorkoutStep | null {
    return session.timeline.steps.find((step) => step.id === snapshot.activeStepId) ?? null;
  }

  private getLiveActivityUpdateKey(
    activityId: string,
    state: {
      workoutStage: string;
      elapsedSeconds: number;
      remainingSeconds: number;
      isTimerRunning: boolean;
    },
  ): string {
    if (state.isTimerRunning) {
      return [activityId, state.workoutStage, 'running'].join('|');
    }

    return [
      activityId,
      state.workoutStage,
      'paused',
      state.elapsedSeconds,
      state.remainingSeconds,
    ].join('|');
  }

  private persistActiveSession(
    session: WorkoutSession,
    snapshot: WorkoutEngineRuntimeSnapshot,
  ): void {
    if (!this.isPersistedWorkoutEngineStatus(snapshot.status)) {
      return;
    }

    const persistenceKey = [
      snapshot.status,
      snapshot.status === 'paused' ? snapshot.elapsedSeconds : snapshot.activeStepId,
      this.liveActivityId ?? 'existing-live-activity',
    ].join('|');

    if (persistenceKey === this.lastSessionPersistenceKey) {
      return;
    }

    this.lastSessionPersistenceKey = persistenceKey;

    const persistedSession: PersistedWorkoutSession = {
      version: 1,
      persistedAt: new Date().toISOString(),
      engineStatus: snapshot.status,
      elapsedSeconds: snapshot.elapsedSeconds,
      liveActivityId: this.liveActivityId,
      session: this.cloneSessionForPersistence(session),
    };

    this.sessionPersistenceWrite = this.sessionPersistenceWrite
      .catch(() => undefined)
      .then(() => Preferences.set({
        key: ACTIVE_WORKOUT_SESSION_PREFERENCES_KEY,
        value: JSON.stringify(persistedSession),
      }))
      .catch((error: unknown) => {
        console.error('Failed to persist active workout session.', error);
      });
  }

  private persistActiveSessionFromCurrentSnapshot(): void {
    const session = this.currentSession;
    const snapshot = this.workoutEngine.getSnapshot();

    if (
      !session
      || session.status !== 'active'
      || !snapshot
      || (snapshot.status !== 'running' && snapshot.status !== 'paused' && snapshot.status !== 'boosting')
    ) {
      return;
    }

    this.persistActiveSession(session, snapshot);
  }

  private async loadPersistedActiveSession(): Promise<PersistedWorkoutSession | null> {
    await this.sessionPersistenceWrite.catch(() => undefined);

    try {
      const result = await Preferences.get({ key: ACTIVE_WORKOUT_SESSION_PREFERENCES_KEY });

      if (!result.value) {
        return null;
      }

      return this.parsePersistedActiveSession(result.value);
    } catch (error: unknown) {
      console.error('Failed to load active workout session.', error);
      await this.removePersistedActiveSession();
      return null;
    }
  }

  private clearPersistedActiveSession(): void {
    this.lastSessionPersistenceKey = null;
    this.sessionPersistenceWrite = this.sessionPersistenceWrite
      .catch(() => undefined)
      .then(() => Preferences.remove({ key: ACTIVE_WORKOUT_SESSION_PREFERENCES_KEY }))
      .catch((error: unknown) => {
        console.error('Failed to clear active workout session.', error);
      });
  }

  private async removePersistedActiveSession(): Promise<void> {
    this.lastSessionPersistenceKey = null;
    await this.sessionPersistenceWrite.catch(() => undefined);

    try {
      await Preferences.remove({ key: ACTIVE_WORKOUT_SESSION_PREFERENCES_KEY });
    } catch (error: unknown) {
      console.error('Failed to remove stale active workout session.', error);
    }
  }

  private parsePersistedActiveSession(value: string): PersistedWorkoutSession | null {
    const parsed: unknown = JSON.parse(value);

    if (!this.isPersistedWorkoutSessionShape(parsed)) {
      void this.removePersistedActiveSession();
      return null;
    }

    return this.rehydratePersistedSession(parsed);
  }

  private isPersistedWorkoutSessionShape(value: unknown): value is PersistedWorkoutSession {
    if (!this.isRecord(value) || value['version'] !== 1) {
      return false;
    }

    if (
      typeof value['persistedAt'] !== 'string'
      || !this.isPersistedWorkoutEngineStatus(value['engineStatus'])
      || typeof value['elapsedSeconds'] !== 'number'
      || !Number.isFinite(value['elapsedSeconds'])
      || (value['liveActivityId'] !== null && typeof value['liveActivityId'] !== 'string')
      || !this.isRecord(value['session'])
    ) {
      return false;
    }

    const session = value['session'];

    return (
      isWorkoutType(typeof session['workoutType'] === 'string' ? session['workoutType'] : null)
      && isWorkoutDuration(typeof session['durationMinutes'] === 'number' ? session['durationMinutes'] : null)
      && isCoachingTone(typeof session['coachingTone'] === 'string' ? session['coachingTone'] : null)
      && typeof session['mainGoal'] === 'string'
      && session['status'] === 'active'
      && session['actualDurationSeconds'] === null
      && session['completedAt'] === null
      && session['completionReason'] === null
      && typeof session['startedAt'] === 'string'
      && this.isValidTimelineShape(session['timeline'])
    );
  }

  private rehydratePersistedSession(persisted: PersistedWorkoutSession): PersistedWorkoutSession | null {
    const startedAt = new Date(persisted.session.startedAt);
    const createdAt = new Date(persisted.session.timeline.createdAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(createdAt.getTime())) {
      void this.removePersistedActiveSession();
      return null;
    }

    return {
      ...persisted,
      elapsedSeconds: Math.max(Math.floor(persisted.elapsedSeconds), 0),
      session: {
        ...persisted.session,
        startedAt,
        completedAt: null,
        timeline: {
          ...persisted.session.timeline,
          createdAt,
        },
      },
    };
  }

  private cloneSessionForPersistence(session: WorkoutSession): WorkoutSession {
    return {
      ...session,
      startedAt: new Date(session.startedAt),
      completedAt: session.completedAt ? new Date(session.completedAt) : null,
      timeline: {
        ...session.timeline,
        createdAt: new Date(session.timeline.createdAt),
      },
    };
  }

  private isPersistedWorkoutEngineStatus(value: unknown): value is PersistedWorkoutEngineStatus {
    return value === 'running' || value === 'paused' || value === 'boosting';
  }

  private isValidTimelineShape(value: unknown): value is WorkoutTimeline {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'string'
      && isWorkoutType(typeof value['workoutType'] === 'string' ? value['workoutType'] : null)
      && isWorkoutDuration(typeof value['durationMinutes'] === 'number' ? value['durationMinutes'] : null)
      && isCoachingTone(typeof value['coachingTone'] === 'string' ? value['coachingTone'] : null)
      && typeof value['title'] === 'string'
      && typeof value['mainGoal'] === 'string'
      && typeof value['totalDurationSeconds'] === 'number'
      && Number.isFinite(value['totalDurationSeconds'])
      && value['totalDurationSeconds'] > 0
      && Array.isArray(value['steps'])
      && Array.isArray(value['cues'])
      && Array.isArray(value['audio'])
      && Array.isArray(value['boosts'])
      && this.isRecord(value['completion'])
      && typeof value['createdAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private resetLiveActivityTracking(): void {
    this.liveActivityId = null;
    this.liveActivityStartPromise = null;
    this.lastLiveActivityUpdateKey = null;
    this.completedLiveActivityId = null;
    this.liveActivityMayExist = false;
  }
}
