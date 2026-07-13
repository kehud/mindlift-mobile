import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { WorkoutSession } from '../core/workout-session/workout-session.model';
import { WorkoutSessionService } from '../core/workout-session/workout-session.service';
import { WorkoutSetupStateService } from '../core/workout-setup/workout-setup-state.service';

@Component({
  selector: 'app-summary',
  templateUrl: 'summary.page.html',
  styleUrls: ['summary.page.scss'],
  standalone: false,
})
export class SummaryPage {
  private readonly router = inject(Router);
  private readonly workoutSessionService = inject(WorkoutSessionService);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);

  session: WorkoutSession | null = null;

  async ionViewWillEnter(): Promise<void> {
    const session = this.workoutSessionService.getCurrentSession();

    if (!session) {
      await this.router.navigateByUrl('/workout-setup', { replaceUrl: true });
      return;
    }

    this.session = session;
  }

  async done(): Promise<void> {
    this.workoutSessionService.clearSession();
    this.workoutSetupState.reset();

    await this.router.navigateByUrl('/home');
  }
}
