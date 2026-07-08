import { FieldValue, Timestamp } from '@angular/fire/firestore';

export type UserProfileProvider = 'password';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: UserProfileProvider;
  onboardingCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreateUserProfileData = Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};
