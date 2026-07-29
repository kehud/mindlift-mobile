import { Component, inject } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { OnboardingProfileService } from '../core/onboarding/onboarding-profile.service';

type AuthAction = 'login' | 'register';
type AuthView = 'login' | 'register';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly onboardingProfileService = inject(OnboardingProfileService);
  private readonly router = inject(Router);

  loginEmail = '';
  loginPassword = '';
  registerEmail = '';
  registerPassword = '';
  errorMessage: string | null = null;
  submittingAction: AuthAction | null = null;
  authView: AuthView = 'login';
  isEmailLoginVisible = false;

  showEmailLogin(): void {
    this.errorMessage = null;
    this.isEmailLoginVisible = true;
  }

  showRegister(): void {
    this.errorMessage = null;
    this.authView = 'register';
  }

  showLogin(): void {
    this.errorMessage = null;
    this.authView = 'login';
    this.isEmailLoginVisible = false;
  }

  onLoginButtonClick(form: NgForm): void {
    void this.submitLoginForm(form);
  }

  onLoginFormSubmit(form: NgForm): void {
    void this.submitLoginForm(form);
  }

  async loginWithEmail(): Promise<void> {
    await this.submitAuthAction('login', async () => {
      await this.authService.loginWithEmail(this.loginEmail, this.loginPassword);
    });
  }

  async registerWithEmail(): Promise<void> {
    await this.submitAuthAction('register', async () => {
      await this.authService.registerWithEmail(this.registerEmail, this.registerPassword);
    });
  }

  private async submitAuthAction(action: AuthAction, authRequest: () => Promise<void>): Promise<void> {
    const submissionBlocked = this.submittingAction !== null;

    if (submissionBlocked) {
      return;
    }

    this.errorMessage = null;
    this.submittingAction = action;
    let failureStage = 'authentication';

    try {
      await authRequest();
      let nextUrl = '/onboarding/about';

      if (action === 'login') {
        failureStage = 'onboarding profile lookup';
        nextUrl = await this.getPostLoginUrl();
      }

      failureStage = 'navigation';
      const navigationSucceeded = await this.router.navigateByUrl(nextUrl, { replaceUrl: true });

      if (!navigationSucceeded) {
        console.error('Post-authentication navigation was cancelled or blocked.', {
          action,
          nextUrl,
        });

        throw new Error(`Unable to navigate to ${nextUrl} after authentication.`);
      }
    } catch (error) {
      console.error('Email/password login flow failed.', {
        action,
        failureStage,
        ...this.getErrorDetails(error),
      });

      this.errorMessage = action === 'login'
        ? 'Unable to log in. Check your email and password, then try again.'
        : 'Unable to create an account. Check the details, then try again.';
    } finally {
      this.submittingAction = null;
    }
  }

  private async submitLoginForm(form: NgForm): Promise<void> {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.errorMessage = 'Enter a valid email and password, then try again.';
      return;
    }

    await this.loginWithEmail();
  }

  private getErrorDetails(error: unknown): { code: string | null; message: string } {
    const authError = error as { code?: unknown; message?: unknown };

    return {
      code: typeof authError.code === 'string' ? authError.code : null,
      message: typeof authError.message === 'string'
        ? authError.message
        : 'Unknown authentication error.',
    };
  }

  private async getPostLoginUrl(): Promise<string> {
    // This is intentionally separate from authentication so profile-read failures are diagnosable.
    const profile = await this.onboardingProfileService.loadProfile();

    return profile?.completedAt ? '/home' : '/onboarding/about';
  }
}
