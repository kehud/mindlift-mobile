import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { SelectionBottomSheetModule } from '../shared/selection-bottom-sheet/selection-bottom-sheet.module';
import { WorkoutSetupPageRoutingModule } from './workout-setup-routing.module';
import { WorkoutSetupPage } from './workout-setup.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SelectionBottomSheetModule,
    WorkoutSetupPageRoutingModule
  ],
  declarations: [WorkoutSetupPage]
})
export class WorkoutSetupPageModule {}
