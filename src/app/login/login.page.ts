import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { OnboardingProfileService } from '../core/onboarding/onboarding-profile.service';

type AuthAction = 'login' | 'register';

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
    this.errorMessage = null;
    this.submittingAction = action;

    try {
      await authRequest();
      const nextUrl = action === 'register'
        ? '/onboarding/about'
        : await this.getPostLoginUrl();

      await this.router.navigateByUrl(nextUrl, { replaceUrl: true });
    } catch {
      this.errorMessage = action === 'login'
        ? 'Unable to log in. Check your email and password, then try again.'
        : 'Unable to create an account. Check the details, then try again.';
    } finally {
      this.submittingAction = null;
    }
  }

  private async getPostLoginUrl(): Promise<string> {
    const profile = await this.onboardingProfileService.loadProfile();

    return profile?.completedAt ? '/home' : '/onboarding/about';
  }
}
