import { inject, Injectable } from '@angular/core';

import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import { WorkoutSession } from './workout-session.model';

@Injectable({
  providedIn: 'root',
})
export class WorkoutSessionService {
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

    this.currentSession = {
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      coachingTone: setup.coachingTone!,
      mainGoal: setup.mainGoal!,
      startedAt: new Date(),
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
}
