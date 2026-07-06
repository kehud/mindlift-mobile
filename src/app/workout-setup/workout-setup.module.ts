import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { WorkoutSetupPageRoutingModule } from './workout-setup-routing.module';
import { WorkoutSetupPage } from './workout-setup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WorkoutSetupPageRoutingModule
  ],
  declarations: [WorkoutSetupPage]
})
export class WorkoutSetupPageModule {}
