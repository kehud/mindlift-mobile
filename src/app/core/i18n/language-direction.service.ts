import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type MindLiftLanguage = 'en' | 'he';
export type MindLiftDirection = 'ltr' | 'rtl';

const DEFAULT_LANGUAGE: MindLiftLanguage = 'en';
const LANGUAGE_PREFERENCE_STORAGE_KEY = 'mindlift.language';
// Keep the localization foundation in place, while the current product ships English only.
const HEBREW_ENABLED = false;

const DIRECTION_BY_LANGUAGE: Record<MindLiftLanguage, MindLiftDirection> = {
  en: 'ltr',
  he: 'rtl',
};

@Injectable({
  providedIn: 'root',
})
export class LanguageDirectionService {
  private readonly document = inject(DOCUMENT);
  readonly language = signal<MindLiftLanguage>(DEFAULT_LANGUAGE);

  initialize(): void {
    this.applyLanguage(this.getSupportedLanguage(this.readStoredLanguage()));
  }

  setLanguage(language: MindLiftLanguage): void {
    const supportedLanguage = this.getSupportedLanguage(language);

    this.persistLanguage(supportedLanguage);
    this.applyLanguage(supportedLanguage);
  }

  getCurrentLanguage(): MindLiftLanguage {
    return this.language();
  }

  getCurrentDirection(): MindLiftDirection {
    return DIRECTION_BY_LANGUAGE[this.language()];
  }

  private applyLanguage(language: MindLiftLanguage): void {
    this.language.set(language);
    this.applyDocumentLanguageDirection();
  }

  private readStoredLanguage(): MindLiftLanguage {
    try {
      const storedLanguage = this.document.defaultView?.localStorage.getItem(
        LANGUAGE_PREFERENCE_STORAGE_KEY,
      );

      return storedLanguage === 'he' || storedLanguage === 'en' ? storedLanguage : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }

  private persistLanguage(language: MindLiftLanguage): void {
    try {
      this.document.defaultView?.localStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, language);
    } catch {
      // Retain the current session language if local storage is unavailable.
    }
  }

  private getSupportedLanguage(language: MindLiftLanguage): MindLiftLanguage {
    return HEBREW_ENABLED && language === 'he' ? 'he' : DEFAULT_LANGUAGE;
  }

  private applyDocumentLanguageDirection(): void {
    this.document.documentElement.lang = this.language();
    this.document.documentElement.dir = this.getCurrentDirection();
  }
}
