import { Component, inject } from '@angular/core';

import { LanguageDirectionService } from './core/i18n/language-direction.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private readonly languageDirection = inject(LanguageDirectionService);

  constructor() {
    this.languageDirection.setLanguage(this.languageDirection.getCurrentLanguage());
  }
}
