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
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Capacitor } from '@capacitor/core';

import { AuthService } from '../auth/auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly firestore = inject(Firestore);
  private readonly isNativePlatform = Capacitor.isNativePlatform();

  async saveProfile(data: SaveOnboardingProfileData, uid?: string): Promise<void> {
    try {
      const profileUid = this.resolveUid(uid);

      if (this.isNativePlatform) {
        await FirebaseFirestore.setDocument({
          reference: this.profilePath(profileUid),
          data: {
            ...data,
            completedAt: new Date().toISOString(),
          },
        });
        return;
      }

      const profileRef = this.profileRef(profileUid);
      const profile: OnboardingProfileDocument = {
        ...data,
        completedAt: serverTimestamp(),
      };

      await setDoc(profileRef, profile);
    } catch (error) {
      console.error('Failed to save onboarding profile.', this.getErrorDetails(error));
      throw error;
    }
  }

  async loadProfile(uid?: string): Promise<OnboardingProfile | null> {
    try {
      const profileUid = this.resolveUid(uid);

      if (this.isNativePlatform) {
        const { snapshot } = await FirebaseFirestore.getDocument<OnboardingProfile>({
          reference: this.profilePath(profileUid),
        });

        return snapshot.data;
      }

      const profileSnapshot = await getDoc(this.profileRef(profileUid));

      if (!profileSnapshot.exists()) {
        return null;
      }

      return profileSnapshot.data() as OnboardingProfile;
    } catch (error) {
      console.error('Failed to load onboarding profile.', this.getErrorDetails(error));
      throw error;
    }
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

  private profilePath(uid: string): string {
    return `users/${uid}/onboarding/profile`;
  }

  private resolveUid(uid?: string): string {
    const resolvedUid = uid ?? (this.isNativePlatform
      ? this.authService.getCurrentUser()?.uid
      : this.auth.currentUser?.uid);

    if (!resolvedUid) {
      throw new Error('Cannot access onboarding profile without an authenticated user.');
    }

    return resolvedUid;
  }

  private getErrorDetails(error: unknown): { code: string | null; message: string } {
    const firestoreError = error as { code?: unknown; message?: unknown };

    return {
      code: typeof firestoreError.code === 'string' ? firestoreError.code : null,
      message: typeof firestoreError.message === 'string'
        ? firestoreError.message
        : 'Unknown Firestore error.',
    };
  }
}
