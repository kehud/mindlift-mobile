import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { WorkoutSession } from '../core/workout-session/workout-session.model';
import { WorkoutSessionService } from '../core/workout-session/workout-session.service';

@Component({
  selector: 'app-active-workout',
  templateUrl: 'active-workout.page.html',
  styleUrls: ['active-workout.page.scss'],
  standalone: false,
})
export class ActiveWorkoutPage {
  private readonly router = inject(Router);
  private readonly workoutSessionService = inject(WorkoutSessionService);

  session: WorkoutSession | null = null;

  async ionViewWillEnter(): Promise<void> {
    const session = await this.workoutSessionService.initializeFromSetup();

    if (!session) {
      await this.router.navigateByUrl('/workout-setup', { replaceUrl: true });
      return;
    }

    this.session = session;
  }

  async finishWorkout(): Promise<void> {
    this.session = this.workoutSessionService.completeCurrentSession();

    await this.router.navigateByUrl('/summary');
  }
}
