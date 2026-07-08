import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';

type AuthAction = 'login' | 'register';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: false,
})
export class LoginPage {
  private readonly authService = inject(AuthService);
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
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch {
      this.errorMessage = action === 'login'
        ? 'Unable to log in. Check your email and password, then try again.'
        : 'Unable to create an account. Check the details, then try again.';
    } finally {
      this.submittingAction = null;
    }
  }
}
