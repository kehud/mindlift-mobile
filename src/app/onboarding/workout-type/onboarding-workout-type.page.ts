import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';

interface OnboardingOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-onboarding-workout-type',
  templateUrl: './onboarding-workout-type.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingWorkoutTypePage {
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  readonly workoutTypeOptions: OnboardingOption[] = [
    { value: 'strength', label: 'Strength' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'mobility', label: 'Mobility' },
    { value: 'yoga', label: 'Yoga' },
  ];

  workoutTypes = this.onboardingState.getSnapshot().workoutTypes;

  get canContinue(): boolean {
    return this.workoutTypes.length > 0;
  }

  isWorkoutTypeSelected(value: string): boolean {
    return this.workoutTypes.includes(value);
  }

  toggleWorkoutType(value: string, checked: boolean): void {
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
