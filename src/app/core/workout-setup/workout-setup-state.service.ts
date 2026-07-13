import { inject, Injectable } from '@angular/core';

import { OnboardingProfileService } from '../onboarding/onboarding-profile.service';
import { WorkoutSetup } from './workout-setup.model';
import {
  CoachingTone,
  isCoachingTone,
  isWorkoutDuration,
  isWorkoutType,
  WorkoutDuration,
  WorkoutType,
} from './workout-setup-options';

@Injectable({
  providedIn: 'root',
})
export class WorkoutSetupStateService {
  private readonly onboardingProfileService = inject(OnboardingProfileService);

  private setup: WorkoutSetup = this.createEmptySetup();

  getSnapshot(): WorkoutSetup {
    return { ...this.setup };
  }

  isCompleteSetup(): boolean {
    return isWorkoutType(this.setup.workoutType)
      && isWorkoutDuration(this.setup.durationMinutes)
      && isCoachingTone(this.setup.coachingTone)
      && this.hasText(this.setup.mainGoal);
  }

  setWorkoutType(workoutType: WorkoutType | null): void {
    this.setup.workoutType = workoutType;
  }

  setDurationMinutes(durationMinutes: WorkoutDuration | null): void {
    this.setup.durationMinutes = durationMinutes;
  }

  setCoachingTone(coachingTone: CoachingTone | null): void {
    this.setup.coachingTone = coachingTone;
  }

  setMainGoal(mainGoal: string | null): void {
    this.setup.mainGoal = mainGoal;
  }

  async prefillFromOnboardingProfile(): Promise<WorkoutSetup> {
    try {
      const onboardingProfile = await this.onboardingProfileService.loadProfile();

      if (onboardingProfile) {
        const coachingTone = isCoachingTone(onboardingProfile.coachingTone)
          ? onboardingProfile.coachingTone
          : null;

        this.setup = {
          ...this.setup,
          coachingTone: this.setup.coachingTone ?? coachingTone,
          mainGoal: this.setup.mainGoal ?? onboardingProfile.mainGoal,
        };
      }
    } catch {
      return this.getSnapshot();
    }

    return this.getSnapshot();
  }

  reset(): void {
    this.setup = this.createEmptySetup();
  }

  private createEmptySetup(): WorkoutSetup {
    return {
      workoutType: null,
      durationMinutes: null,
      coachingTone: null,
      mainGoal: null,
    };
  }

  private hasText(value: string | null): value is string {
    return value !== null && value.trim().length > 0;
  }
}
