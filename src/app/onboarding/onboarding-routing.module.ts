import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OnboardingAboutPage } from './about/onboarding-about.page';
import { OnboardingGoalPage } from './goal/onboarding-goal.page';
import { OnboardingPronounPage } from './pronoun/onboarding-pronoun.page';
import { OnboardingTonePage } from './tone/onboarding-tone.page';
import { OnboardingWorkoutTypePage } from './workout-type/onboarding-workout-type.page';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'about',
    pathMatch: 'full',
  },
  {
    path: 'about',
    component: OnboardingAboutPage,
  },
  {
    path: 'pronoun',
    component: OnboardingPronounPage,
  },
  {
    path: 'tone',
    component: OnboardingTonePage,
  },
  {
    path: 'workout-type',
    component: OnboardingWorkoutTypePage,
  },
  {
    path: 'goal',
    component: OnboardingGoalPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OnboardingRoutingModule {}
