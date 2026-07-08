import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';

@Component({
  selector: 'app-onboarding-about',
  templateUrl: './onboarding-about.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingAboutPage {
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  displayName = this.onboardingState.getSnapshot().displayName ?? '';

  get canContinue(): boolean {
    return this.displayName.trim().length > 0;
  }

  async continue(): Promise<void> {
    if (!this.canContinue) {
      return;
    }

    this.onboardingState.setDisplayName(this.displayName);
    await this.router.navigateByUrl('/onboarding/pronoun');
  }
}
