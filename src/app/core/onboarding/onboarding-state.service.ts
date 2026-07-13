import { Injectable } from '@angular/core';

import { CoachingTone, WorkoutType } from '../workout-setup/workout-setup-options';
import { SaveOnboardingProfileData } from './onboarding-profile.model';

export interface OnboardingAnswers {
  displayName: string | null;
  pronoun: string | null;
  coachingTone: CoachingTone | null;
  workoutTypes: WorkoutType[];
  mainGoal: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingStateService {
  private answers: OnboardingAnswers = this.createEmptyAnswers();

  getSnapshot(): OnboardingAnswers {
    return {
      ...this.answers,
      workoutTypes: [...this.answers.workoutTypes],
    };
  }

  setDisplayName(displayName: string): void {
    this.answers.displayName = displayName.trim();
  }

  setPronoun(pronoun: string): void {
    this.answers.pronoun = pronoun;
  }

  setCoachingTone(coachingTone: CoachingTone): void {
    this.answers.coachingTone = coachingTone;
  }

  setWorkoutTypes(workoutTypes: WorkoutType[]): void {
    this.answers.workoutTypes = [...workoutTypes];
  }

  setMainGoal(mainGoal: string): void {
    this.answers.mainGoal = mainGoal.trim();
  }

  toProfileData(): SaveOnboardingProfileData | null {
    const displayName = this.answers.displayName?.trim();
    const pronoun = this.answers.pronoun;
    const coachingTone = this.answers.coachingTone;
    const mainGoal = this.answers.mainGoal?.trim();
    const workoutTypes = this.answers.workoutTypes;

    if (!displayName || !pronoun || !coachingTone || workoutTypes.length === 0 || !mainGoal) {
      return null;
    }

    return {
      displayName,
      pronoun,
      coachingTone,
      workoutTypes: [...workoutTypes],
      mainGoal,
    };
  }

  reset(): void {
    this.answers = this.createEmptyAnswers();
  }

  private createEmptyAnswers(): OnboardingAnswers {
    return {
      displayName: null,
      pronoun: null,
      coachingTone: null,
      workoutTypes: [],
      mainGoal: null,
    };
  }
}
