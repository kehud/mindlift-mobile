import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { OnboardingProfileService } from '../../core/onboarding/onboarding-profile.service';
import { OnboardingStateService } from '../../core/onboarding/onboarding-state.service';

@Component({
  selector: 'app-onboarding-goal',
  templateUrl: './onboarding-goal.page.html',
  styleUrls: ['../onboarding-step.scss'],
  standalone: false,
})
export class OnboardingGoalPage {
  private readonly onboardingProfileService = inject(OnboardingProfileService);
  private readonly onboardingState = inject(OnboardingStateService);
  private readonly router = inject(Router);

  errorMessage: string | null = null;
  mainGoal = this.onboardingState.getSnapshot().mainGoal ?? '';
  saving = false;

  get canSave(): boolean {
    return this.mainGoal.trim().length > 0 && !this.saving;
  }

  async save(): Promise<void> {
    if (!this.canSave) {
      return;
    }

    this.errorMessage = null;
    this.saving = true;
    this.onboardingState.setMainGoal(this.mainGoal);

    const profile = this.onboardingState.toProfileData();

    if (!profile) {
      this.errorMessage = 'Please complete each onboarding step before continuing.';
      this.saving = false;
      return;
    }

    try {
      await this.onboardingProfileService.saveProfile(profile);
      this.onboardingState.reset();
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (error) {
      console.error('Onboarding profile save failed.', error);
      this.errorMessage = 'Unable to save your onboarding profile. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}
