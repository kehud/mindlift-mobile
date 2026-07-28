import { inject, Injectable } from '@angular/core';
import {
  doc,
  Firestore,
  runTransaction,
  serverTimestamp,
} from '@angular/fire/firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Capacitor } from '@capacitor/core';

import { AuthenticatedUser } from '../auth/authenticated-user.model';
import { CreateUserProfileData } from './user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly firestore = inject(Firestore);
  private readonly isNativePlatform = Capacitor.isNativePlatform();

  async createPasswordUserProfile(user: AuthenticatedUser): Promise<void> {
    if (this.isNativePlatform) {
      const reference = `users/${user.uid}`;
      const { snapshot } = await FirebaseFirestore.getDocument({ reference });

      if (snapshot.data) {
        return;
      }

      await FirebaseFirestore.setDocument({
        reference,
        data: {
          uid: user.uid,
          email: user.email,
          displayName: null,
          photoURL: null,
          provider: 'password',
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const userRef = doc(this.firestore, 'users', user.uid);

    await runTransaction(this.firestore, async (transaction) => {
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
