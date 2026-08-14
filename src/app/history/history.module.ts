import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HistoryPageRoutingModule } from './history-routing.module';
import { HistoryPage } from './history.page';
import { HistoryDetailPage } from '../history-detail/history-detail.page';
import { FloatingNavigationModule } from '../shared/floating-navigation/floating-navigation.module';
import { HistoryCalendarBottomSheetModule } from '../shared/history-calendar-bottom-sheet/history-calendar-bottom-sheet.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HistoryPageRoutingModule,
    FloatingNavigationModule,
    HistoryCalendarBottomSheetModule,
  ],
  declarations: [HistoryPage, HistoryDetailPage]
})
export class HistoryPageModule {}
