import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { HistoryCalendarBottomSheetComponent } from './history-calendar-bottom-sheet.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [HistoryCalendarBottomSheetComponent],
  exports: [HistoryCalendarBottomSheetComponent],
})
export class HistoryCalendarBottomSheetModule {}
