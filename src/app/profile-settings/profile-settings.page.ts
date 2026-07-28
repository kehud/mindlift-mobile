import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { ThemePreference, ThemeService } from '../core/theme/theme.service';

@Component({
  selector: 'app-profile-settings',
  templateUrl: 'profile-settings.page.html',
  styleUrls: ['profile-settings.page.scss'],
  standalone: false,
})
export class ProfileSettingsPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  readonly currentUser$ = this.authService.currentUser$;
  readonly shellLabels = {
    back: 'Back',
    dark: 'Dark',
    light: 'Light',
    logout: 'Log out',
    settings: 'Settings',
    system: 'System',
    theme: 'Theme',
  };
  readonly themePreference = this.themeService.preference;

  isLoggingOut = false;
  errorMessage: string | null = null;

  selectTheme(preference: ThemePreference): void {
    this.themeService.setPreference(preference);
  }

  async logout(): Promise<void> {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.errorMessage = null;

    try {
      await this.authService.logout();
      const navigated = await this.router.navigateByUrl('/login', { replaceUrl: true });

      if (!navigated) {
        throw new Error('Navigation to Login was cancelled.');
      }
    } catch (error) {
      console.error('Logout failed.', this.getErrorDetails(error));
      this.errorMessage = 'We could not sign you out. Please try again.';
    } finally {
      this.isLoggingOut = false;
    }
  }

  private getErrorDetails(error: unknown): { code: string | null; message: string } {
    const appError = error as { code?: unknown; message?: unknown };

    return {
      code: typeof appError.code === 'string' ? appError.code : null,
      message: typeof appError.message === 'string' ? appError.message : 'Unknown error.',
    };
  }
}
