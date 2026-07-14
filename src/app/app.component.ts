import { Component, inject, OnDestroy } from '@angular/core';

import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

import { LanguageDirectionService } from './core/i18n/language-direction.service';
import { WorkoutEngineService } from './core/workout-engine/workout-engine.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  private readonly languageDirection = inject(LanguageDirectionService);
  private readonly workoutEngine = inject(WorkoutEngineService);

  private appStateListener: Promise<PluginListenerHandle> | null = null;

  constructor() {
    this.languageDirection.setLanguage(this.languageDirection.getCurrentLanguage());
    this.registerAppStateListener();
  }

  ngOnDestroy(): void {
    const appStateListener = this.appStateListener;

    this.appStateListener = null;
    void appStateListener
      ?.then((listener) => listener.remove())
      .catch(() => undefined);
  }

  private registerAppStateListener(): void {
    if (this.appStateListener) {
      return;
    }

    this.appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.workoutEngine.syncAfterBackground();
      }
    });
  }
}
