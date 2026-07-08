import { FieldValue, Timestamp } from '@angular/fire/firestore';

export interface OnboardingProfile {
  displayName: string;
  pronoun: string;
  coachingTone: string;
  workoutTypes: string[];
  mainGoal: string;
  completedAt: Timestamp;
}

export type SaveOnboardingProfileData = Omit<OnboardingProfile, 'completedAt'>;

export type OnboardingProfileDocument = SaveOnboardingProfileData & {
  completedAt: Timestamp | FieldValue;
};
