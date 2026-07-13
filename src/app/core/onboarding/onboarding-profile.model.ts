import { FieldValue, Timestamp } from '@angular/fire/firestore';

import { CoachingTone, WorkoutType } from '../workout-setup/workout-setup-options';

export interface OnboardingProfile {
  displayName: string;
  pronoun: string;
  coachingTone: CoachingTone;
  workoutTypes: WorkoutType[];
  mainGoal: string;
  completedAt: Timestamp;
}

export type SaveOnboardingProfileData = Omit<OnboardingProfile, 'completedAt'>;

export type OnboardingProfileDocument = SaveOnboardingProfileData & {
  completedAt: Timestamp | FieldValue;
};
