import { inject, Injectable } from '@angular/core';
import { User } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  runTransaction,
  serverTimestamp,
} from '@angular/fire/firestore';

import { CreateUserProfileData } from './user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly firestore = inject(Firestore);

  createPasswordUserProfile(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);

    return runTransaction(this.firestore, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);

      if (userSnapshot.exists()) {
        return;
      }

      const timestamp = serverTimestamp();
      const userProfile: CreateUserProfileData = {
        uid: user.uid,
        email: user.email,
        displayName: null,
        photoURL: null,
        provider: 'password',
        onboardingCompleted: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      transaction.set(userRef, userProfile);
    });
  }
}
