import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { OnboardingAboutPage } from './about/onboarding-about.page';
import { OnboardingGoalPage } from './goal/onboarding-goal.page';
import { OnboardingRoutingModule } from './onboarding-routing.module';
import { OnboardingPronounPage } from './pronoun/onboarding-pronoun.page';
import { OnboardingTonePage } from './tone/onboarding-tone.page';
import { OnboardingWorkoutTypePage } from './workout-type/onboarding-workout-type.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OnboardingRoutingModule,
  ],
  declarations: [
    OnboardingAboutPage,
    OnboardingPronounPage,
    OnboardingTonePage,
    OnboardingWorkoutTypePage,
    OnboardingGoalPage,
  ],
})
export class OnboardingModule {}
