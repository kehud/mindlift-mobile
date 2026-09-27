import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { activeWorkoutExitGuard } from './active-workout-exit.guard';
import { ActiveWorkoutPage } from './active-workout.page';

const routes: Routes = [
  {
    path: '',
    component: ActiveWorkoutPage,
    canDeactivate: [activeWorkoutExitGuard],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ActiveWorkoutPageRoutingModule {}
