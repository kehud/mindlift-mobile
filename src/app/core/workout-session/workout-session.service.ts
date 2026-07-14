import { inject, Injectable } from '@angular/core';

import { LanguageDirectionService } from '../i18n/language-direction.service';
import type { WorkoutTimeline } from '../workout-engine/models/workout-timeline.models';
import { generateWorkoutTimeline } from '../workout-engine/workout-timeline-generator';
import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import type { WorkoutSetup } from '../workout-setup/workout-setup.model';
import type { WorkoutSession } from './workout-session.model';

@Injectable({
  providedIn: 'root',
})
export class WorkoutSessionService {
  private readonly languageDirection = inject(LanguageDirectionService);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);

  private currentSession: WorkoutSession | null = null;

  getCurrentSession(): WorkoutSession | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      ...this.currentSession,
      startedAt: new Date(this.currentSession.startedAt),
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
      status: 'active',
    };

    return this.getCurrentSession();
  }

  completeCurrentSession(): WorkoutSession | null {
    if (!this.currentSession) {
      return null;
    }

    this.currentSession = {
      ...this.currentSession,
      status: 'completed',
    };

    return this.getCurrentSession();
  }

  clearSession(): void {
    this.currentSession = null;
  }

  private generateTimelineFromSetup(setup: WorkoutSetup, startedAt: Date): WorkoutTimeline {
    return generateWorkoutTimeline({
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      plannedDurationSeconds: setup.durationMinutes! * 60,
      coachingTone: setup.coachingTone!,
      language: this.languageDirection.getCurrentLanguage(),
      mainGoal: setup.mainGoal!,
      createdAt: startedAt,
    }, []);
  }
}
