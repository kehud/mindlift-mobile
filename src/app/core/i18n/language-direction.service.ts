import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export type MindLiftLanguage = 'en' | 'he';
export type MindLiftDirection = 'ltr' | 'rtl';

const DEFAULT_LANGUAGE: MindLiftLanguage = 'en';

const DIRECTION_BY_LANGUAGE: Record<MindLiftLanguage, MindLiftDirection> = {
  en: 'ltr',
  he: 'rtl',
};

@Injectable({
  providedIn: 'root',
})
export class LanguageDirectionService {
  private currentLanguage: MindLiftLanguage = DEFAULT_LANGUAGE;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  setLanguage(language: MindLiftLanguage): void {
    this.currentLanguage = language;
    this.applyDocumentLanguageDirection();
  }

  getCurrentLanguage(): MindLiftLanguage {
    return this.currentLanguage;
  }

  getCurrentDirection(): MindLiftDirection {
    return DIRECTION_BY_LANGUAGE[this.currentLanguage];
  }

  private applyDocumentLanguageDirection(): void {
    this.document.documentElement.lang = this.currentLanguage;
    this.document.documentElement.dir = this.getCurrentDirection();
  }
}
