import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { SelectionBottomSheetComponent } from './selection-bottom-sheet.component';

@NgModule({
  declarations: [SelectionBottomSheetComponent],
  exports: [SelectionBottomSheetComponent],
  imports: [CommonModule, IonicModule],
})
export class SelectionBottomSheetModule {}
