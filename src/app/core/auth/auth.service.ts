import { inject, Injectable } from '@angular/core';
import {
  Auth,
  User,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  user,
} from '@angular/fire/auth';
import {
  FirebaseAuthentication,
  type User as NativeFirebaseUser,
} from '@capacitor-firebase/authentication';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Observable, ReplaySubject, of } from 'rxjs';

import { UserProfileService } from '../user/user-profile.service';
import { AuthenticatedUser } from './authenticated-user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly userProfileService = inject(UserProfileService);
  private readonly isNativePlatform = Capacitor.isNativePlatform();
  private readonly nativeUserState = new ReplaySubject<AuthenticatedUser | null>(1);
  private readonly nativeAuthInitializationComplete = new ReplaySubject<void>(1);
  private nativeAuthStateListener: PluginListenerHandle | null = null;
  private nativeCurrentUser: AuthenticatedUser | null = null;
  private nativeAuthInitialized = false;
  private nativeAuthInitializationStarted = false;

  readonly authState$: Observable<AuthenticatedUser | null>;
  readonly currentUser$: Observable<AuthenticatedUser | null>;
  readonly authInitializationComplete$: Observable<void>;

  constructor() {
    if (this.isNativePlatform) {
      this.authState$ = this.nativeUserState.asObservable();
      this.currentUser$ = this.nativeUserState.asObservable();
      this.authInitializationComplete$ = this.nativeAuthInitializationComplete.asObservable();
      return;
    }

    this.authState$ = authState(this.auth);
    this.currentUser$ = user(this.auth);
    this.authInitializationComplete$ = of<void>(undefined);
  }

  initializeAuthState(): void {
    if (!this.isNativePlatform || this.nativeAuthInitializationStarted) {
      return;
    }

    this.nativeAuthInitializationStarted = true;
    void this.initializeNativeAuthState();
  }

  async loginWithEmail(email: string, password: string): Promise<AuthenticatedUser> {
    try {
      if (this.isNativePlatform) {
        const result = await FirebaseAuthentication.signInWithEmailAndPassword({
          email,
          password,
        });
        const authenticatedUser = this.toAuthenticatedUser(result.user);

        if (!authenticatedUser) {
          throw new Error('Native Firebase Auth did not return an authenticated user.');
        }

        this.setNativeUser(authenticatedUser);
        return authenticatedUser;
      }

      const credential = await signInWithEmailAndPassword(this.auth, email, password);

      return this.toAuthenticatedUser(credential.user)!;
    } catch (error) {
      console.error('Email/password authentication failed.', this.getErrorDetails(error));
      throw error;
    }
  }

  async registerWithEmail(email: string, password: string): Promise<AuthenticatedUser> {
    try {
      let authenticatedUser: AuthenticatedUser | null;

      if (this.isNativePlatform) {
        const result = await FirebaseAuthentication.createUserWithEmailAndPassword({
          email,
          password,
        });

        authenticatedUser = this.toAuthenticatedUser(result.user);
      } else {
        const credential = await createUserWithEmailAndPassword(this.auth, email, password);

        authenticatedUser = this.toAuthenticatedUser(credential.user);
      }

      if (!authenticatedUser) {
        throw new Error('Firebase Auth did not return an authenticated user.');
      }

      if (this.isNativePlatform) {
        this.setNativeUser(authenticatedUser);
      }

      await this.userProfileService.createPasswordUserProfile(authenticatedUser);

      return authenticatedUser;
    } catch (error) {
      console.error('Email/password registration failed.', this.getErrorDetails(error));
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (this.isNativePlatform) {
      await FirebaseAuthentication.signOut();
      this.setNativeUser(null);
      return;
    }

    await signOut(this.auth);
  }

  getCurrentUser(): AuthenticatedUser | null {
    if (this.isNativePlatform) {
      return this.nativeCurrentUser;
    }

    return this.toAuthenticatedUser(this.auth.currentUser);
  }

  private async initializeNativeAuthState(): Promise<void> {
    console.info('Native auth initialization started.');

    try {
      this.nativeAuthStateListener = await FirebaseAuthentication.addListener(
        'authStateChange',
        ({ user: nativeUser }) => {
          if (this.nativeAuthInitialized) {
            this.setNativeUser(this.toAuthenticatedUser(nativeUser));
          }
        },
      );
      const { user: nativeUser } = await FirebaseAuthentication.getCurrentUser();
      const authenticatedUser = this.toAuthenticatedUser(nativeUser);

      console.info('Native Firebase getCurrentUser completed.', {
        authenticated: Boolean(authenticatedUser),
      });

      this.nativeAuthInitialized = true;
      this.setNativeUser(authenticatedUser);
    } catch (error) {
      console.error('Failed to initialize native Firebase Auth state.', this.getErrorDetails(error));
      console.info('Native Firebase getCurrentUser completed.', {
        authenticated: false,
        failed: true,
      });
      this.nativeAuthInitialized = true;
      this.setNativeUser(null);
    } finally {
      this.nativeAuthInitializationComplete.next();
      this.nativeAuthInitializationComplete.complete();
      console.info('Native auth initialization completed.');
    }
  }

  private setNativeUser(user: AuthenticatedUser | null): void {
    this.nativeCurrentUser = user;
    this.nativeUserState.next(user);
  }

  private toAuthenticatedUser(user: User | NativeFirebaseUser | null): AuthenticatedUser | null {
    if (!user) {
      return null;
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: 'photoURL' in user ? user.photoURL : user.photoUrl,
    };
  }

  private getErrorDetails(error: unknown): { code: string | null; message: string } {
    const firebaseError = error as { code?: unknown; message?: unknown };

    return {
      code: typeof firebaseError.code === 'string' ? firebaseError.code : null,
      message: typeof firebaseError.message === 'string'
        ? firebaseError.message
        : 'Unknown Firebase error.',
    };
  }
}
