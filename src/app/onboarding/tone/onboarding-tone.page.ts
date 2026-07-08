import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';

interface OnboardingOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-onboarding-tone',
  templateUrl: './onboarding-tone.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingTonePage {
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  readonly toneOptions: OnboardingOption[] = [
    { value: 'supportive', label: 'Supportive' },
    { value: 'direct', label: 'Direct' },
    { value: 'calm', label: 'Calm' },
    { value: 'high-energy', label: 'High energy' },
  ];

  coachingTone = this.onboardingState.getSnapshot().coachingTone ?? '';

  get canContinue(): boolean {
    return this.coachingTone.length > 0;
  }

  async continue(): Promise<void> {
    if (!this.canContinue) {
      return;
    }

    this.onboardingState.setCoachingTone(this.coachingTone);
    await this.router.navigateByUrl('/onboarding/workout-type');
  }
}
