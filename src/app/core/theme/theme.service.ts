import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_STORAGE_KEY = 'mindlift.theme-preference';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mediaQuery = this.document.defaultView?.matchMedia('(prefers-color-scheme: light)') ?? null;

  readonly preference = signal<ThemePreference>('dark');

  constructor() {
    this.mediaQuery?.addEventListener('change', () => {
      if (this.preference() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  initialize(): void {
    const preference = this.readStoredPreference();

    this.preference.set(preference);
    this.applyTheme(preference);
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    this.persistPreference(preference);
    this.applyTheme(preference);
  }

  private applyTheme(preference: ThemePreference): void {
    const theme = preference === 'system'
      ? (this.mediaQuery?.matches ? 'light' : 'dark')
      : preference;

    this.document.documentElement.dataset['theme'] = theme;
    this.document.body?.setAttribute('data-theme', theme);
  }

  private readStoredPreference(): ThemePreference {
    try {
      const storedPreference = this.document.defaultView?.localStorage.getItem(
        THEME_PREFERENCE_STORAGE_KEY,
      );

      return this.isThemePreference(storedPreference) ? storedPreference : 'dark';
    } catch {
      return 'dark';
    }
  }

  private persistPreference(preference: ThemePreference): void {
    try {
      this.document.defaultView?.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
    } catch {
      // A private browsing context can make local storage unavailable; retain this session's choice.
    }
  }

  private isThemePreference(value: string | null | undefined): value is ThemePreference {
    return value === 'system' || value === 'light' || value === 'dark';
  }
}
