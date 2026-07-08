import { inject, Injectable } from '@angular/core';
import {
  Auth,
  User,
  UserCredential,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  user,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

import { UserProfileService } from '../user/user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly userProfileService = inject(UserProfileService);

  readonly authState$: Observable<User | null> = authState(this.auth);
  readonly currentUser$: Observable<User | null> = user(this.auth);

  loginWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async registerWithEmail(email: string, password: string): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);

    await this.userProfileService.createPasswordUserProfile(credential.user);

    return credential;
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
