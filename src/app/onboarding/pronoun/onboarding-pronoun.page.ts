import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';

interface OnboardingOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-onboarding-pronoun',
  templateUrl: './onboarding-pronoun.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingPronounPage {
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  readonly pronounOptions: OnboardingOption[] = [
    { value: 'she/her', label: 'She/her' },
    { value: 'he/him', label: 'He/him' },
    { value: 'they/them', label: 'They/them' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ];

  pronoun = this.onboardingState.getSnapshot().pronoun ?? '';

  get canContinue(): boolean {
    return this.pronoun.length > 0;
  }

  async continue(): Promise<void> {
    if (!this.canContinue) {
      return;
    }

    this.onboardingState.setPronoun(this.pronoun);
    await this.router.navigateByUrl('/onboarding/tone');
  }
}
