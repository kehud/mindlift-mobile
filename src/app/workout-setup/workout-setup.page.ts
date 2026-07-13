import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { WorkoutSetup } from '../core/workout-setup/workout-setup.model';
import {
  CoachingTone,
  WORKOUT_DURATION_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  WorkoutDuration,
  WorkoutType,
} from '../core/workout-setup/workout-setup-options';
import { WorkoutSetupStateService } from '../core/workout-setup/workout-setup-state.service';

@Component({
  selector: 'app-workout-setup',
  templateUrl: 'workout-setup.page.html',
  styleUrls: ['workout-setup.page.scss'],
  standalone: false,
})
export class WorkoutSetupPage {
  private readonly router = inject(Router);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);

  readonly workoutTypeOptions = WORKOUT_TYPE_OPTIONS;
  readonly durationOptions = WORKOUT_DURATION_OPTIONS;

  workoutType: WorkoutType | null = null;
  durationMinutes: WorkoutDuration | null = null;
  coachingTone: CoachingTone | null = null;
  mainGoal: string | null = null;

  get canContinue(): boolean {
    return this.workoutType !== null && this.durationMinutes !== null;
  }

  async ionViewWillEnter(): Promise<void> {
    const setup = await this.workoutSetupState.prefillFromOnboardingProfile();

    this.applySetup(setup);
  }

  async continue(): Promise<void> {
    if (!this.canContinue) {
      return;
    }

    this.workoutSetupState.setWorkoutType(this.workoutType);
    this.workoutSetupState.setDurationMinutes(this.durationMinutes);
    this.workoutSetupState.setCoachingTone(this.coachingTone);
    this.workoutSetupState.setMainGoal(this.mainGoal);

    await this.router.navigateByUrl('/active-workout');
  }

  private applySetup(setup: WorkoutSetup): void {
    this.workoutType = setup.workoutType;
    this.durationMinutes = setup.durationMinutes;
    this.coachingTone = setup.coachingTone;
    this.mainGoal = setup.mainGoal;
  }
}
