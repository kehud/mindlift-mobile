import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HistoryPage } from './history.page';
import { HistoryDetailPage } from '../history-detail/history-detail.page';

const routes: Routes = [
  {
    path: '',
    component: HistoryPage,
    pathMatch: 'full',
  },
  {
    path: 'details/:workoutId',
    component: HistoryDetailPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HistoryPageRoutingModule {}
