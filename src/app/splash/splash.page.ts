import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { WorkoutSessionService } from '../core/workout-session/workout-session.service';

@Component({
  selector: 'app-splash',
  templateUrl: 'splash.page.html',
  styleUrls: ['splash.page.scss'],
  standalone: false,
})
export class SplashPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly workoutSession = inject(WorkoutSessionService);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      firstValueFrom(this.authService.authInitializationComplete$),
      new Promise<void>((resolve) => window.setTimeout(resolve, 2000)),
    ]);
    const user = await firstValueFrom(this.authService.currentUser$);

    try {
      if (!user) {
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      const restoredWorkout = await this.workoutSession.restorePersistedActiveSession();
      await this.router.navigateByUrl(restoredWorkout ? '/active-workout' : '/home', { replaceUrl: true });
    } catch (error) {
      console.error('Unable to continue from Splash.', error);
    }
  }
}
