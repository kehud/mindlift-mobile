import { inject, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

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

const WORKOUT_SETUP_PREFERENCES_KEY = 'workoutSetupPreferences';

interface WorkoutSetupPreferences {
  focusArea: WorkoutType | null;
  duration: WorkoutDuration | null;
  coachingStyle: CoachingTone | null;
  todaysIntention: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class WorkoutSetupStateService {
  private readonly onboardingProfileService = inject(OnboardingProfileService);

  private setup: WorkoutSetup = this.createEmptySetup();
  private preferencesWrite = Promise.resolve();

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
    this.persistPreferences();
  }

  setDurationMinutes(durationMinutes: WorkoutDuration | null): void {
    this.setup.durationMinutes = durationMinutes;
    this.persistPreferences();
  }

  setCoachingTone(coachingTone: CoachingTone | null): void {
    this.setup.coachingTone = coachingTone;
    this.persistPreferences();
  }

  setMainGoal(mainGoal: string | null): void {
    this.setup.mainGoal = mainGoal;
    this.persistPreferences();
  }

  async prefillFromOnboardingProfile(): Promise<WorkoutSetup> {
    await this.loadPreferences();

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

  private async loadPreferences(): Promise<void> {
    try {
      await this.preferencesWrite;
      const { value } = await Preferences.get({ key: WORKOUT_SETUP_PREFERENCES_KEY });
      const parsedPreferences: unknown = value ? JSON.parse(value) : {};
      const preferences = parsedPreferences && typeof parsedPreferences === 'object'
        ? parsedPreferences as Partial<WorkoutSetupPreferences>
        : {};

      this.setup.workoutType = isWorkoutType(preferences.focusArea ?? null)
        ? preferences.focusArea ?? null
        : null;
      this.setup.durationMinutes = isWorkoutDuration(preferences.duration ?? null)
        ? preferences.duration ?? null
        : null;
      this.setup.coachingTone = isCoachingTone(preferences.coachingStyle ?? null)
        ? preferences.coachingStyle ?? null
        : null;
      this.setup.mainGoal = typeof preferences.todaysIntention === 'string'
        ? preferences.todaysIntention
        : null;
    } catch {
      return;
    }
  }

  private persistPreferences(): void {
    const preferences: WorkoutSetupPreferences = {
      focusArea: this.setup.workoutType,
      duration: this.setup.durationMinutes,
      coachingStyle: this.setup.coachingTone,
      todaysIntention: this.setup.mainGoal,
    };

    this.preferencesWrite = this.preferencesWrite
      .catch(() => undefined)
      .then(() => Preferences.set({
        key: WORKOUT_SETUP_PREFERENCES_KEY,
        value: JSON.stringify(preferences),
      }));
  }

  private hasText(value: string | null): value is string {
    return value !== null && value.trim().length > 0;
  }
}
