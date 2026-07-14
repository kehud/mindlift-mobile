import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { WorkoutEngineService } from '../core/workout-engine/workout-engine.service';
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
  private readonly workoutEngine = inject(WorkoutEngineService);
  private readonly workoutSessionService = inject(WorkoutSessionService);

  private navigatingToSummary = false;

  private readonly automaticCompletionEffect = effect(() => {
    const snapshot = this.workoutEngine.snapshot();

    if (
      snapshot?.status === 'completed'
      && snapshot.completionReason === 'timeline_completed'
    ) {
      void this.finishWorkout();
    }
  });

  session: WorkoutSession | null = null;

  async ionViewWillEnter(): Promise<void> {
    this.navigatingToSummary = false;

    const session = await this.workoutSessionService.initializeFromSetup();

    if (!session) {
      await this.router.navigateByUrl('/workout-setup', { replaceUrl: true });
      return;
    }

    this.session = session;
  }

  async finishWorkout(): Promise<void> {
    this.session = this.workoutSessionService.completeCurrentSession();

    await this.navigateToSummary();
  }

  private async navigateToSummary(): Promise<void> {
    if (this.navigatingToSummary) {
      return;
    }

    this.navigatingToSummary = true;

    await this.router.navigateByUrl('/summary');
  }
}
