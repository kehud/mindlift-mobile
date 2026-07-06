import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { WorkoutSetupPage } from './workout-setup.page';

const routes: Routes = [
  {
    path: '',
    component: WorkoutSetupPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WorkoutSetupPageRoutingModule {}
