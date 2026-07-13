import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';
import {
  COACHING_TONE_OPTIONS,
  CoachingTone,
} from '../../core/workout-setup/workout-setup-options';

@Component({
  selector: 'app-onboarding-tone',
  templateUrl: './onboarding-tone.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingTonePage {
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  readonly toneOptions = COACHING_TONE_OPTIONS;

  coachingTone: CoachingTone | null = this.onboardingState.getSnapshot().coachingTone;

  get canContinue(): boolean {
    return this.coachingTone !== null;
  }

  async continue(): Promise<void> {
    if (this.coachingTone === null) {
      return;
    }

    this.onboardingState.setCoachingTone(this.coachingTone);
    await this.router.navigateByUrl('/onboarding/workout-type');
  }
}
