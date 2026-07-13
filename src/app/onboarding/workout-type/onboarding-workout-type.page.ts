import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';
import {
  WORKOUT_TYPE_OPTIONS,
  WorkoutType,
} from '../../core/workout-setup/workout-setup-options';

@Component({
  selector: 'app-onboarding-workout-type',
  templateUrl: './onboarding-workout-type.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingWorkoutTypePage {
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  readonly workoutTypeOptions = WORKOUT_TYPE_OPTIONS;

  workoutTypes = this.onboardingState.getSnapshot().workoutTypes;

  get canContinue(): boolean {
    return this.workoutTypes.length > 0;
  }

  isWorkoutTypeSelected(value: WorkoutType): boolean {
    return this.workoutTypes.includes(value);
  }

  toggleWorkoutType(value: WorkoutType, checked: boolean): void {
    if (checked) {
      this.workoutTypes = this.isWorkoutTypeSelected(value)
        ? this.workoutTypes
        : [...this.workoutTypes, value];
      return;
    }

    this.workoutTypes = this.workoutTypes.filter((workoutType) => workoutType !== value);
  }

  async continue(): Promise<void> {
    if (!this.canContinue) {
      return;
    }

    this.onboardingState.setWorkoutTypes(this.workoutTypes);
    await this.router.navigateByUrl('/onboarding/goal');
  }
}
