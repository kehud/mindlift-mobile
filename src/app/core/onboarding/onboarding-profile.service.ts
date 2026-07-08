import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';

import {
  OnboardingProfile,
  OnboardingProfileDocument,
  SaveOnboardingProfileData,
} from './onboarding-profile.model';

@Injectable({
  providedIn: 'root',
})
export class OnboardingProfileService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  async saveProfile(data: SaveOnboardingProfileData, uid = this.currentUid()): Promise<void> {
    const profileRef = this.profileRef(uid);
    const profile: OnboardingProfileDocument = {
      ...data,
      completedAt: serverTimestamp(),
    };

    try {
      await setDoc(profileRef, profile);
    } catch (error) {
      console.error('Failed to save onboarding profile.', {
        error,
        path: profileRef.path,
        uid,
      });

      throw error;
    }
  }

  async loadProfile(uid = this.currentUid()): Promise<OnboardingProfile | null> {
    const profileSnapshot = await getDoc(this.profileRef(uid));

    if (!profileSnapshot.exists()) {
      return null;
    }

    return profileSnapshot.data() as OnboardingProfile;
  }

  private profileRef(uid: string): DocumentReference<OnboardingProfileDocument> {
    return doc(
      this.firestore,
      'users',
      uid,
      'onboarding',
      'profile',
    ) as DocumentReference<OnboardingProfileDocument>;
  }

  private currentUid(): string {
    const uid = this.auth.currentUser?.uid;

    if (!uid) {
      throw new Error('Cannot access onboarding profile without an authenticated user.');
    }

    return uid;
  }
}
