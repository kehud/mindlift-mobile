import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { FloatingNavigationComponent } from './floating-navigation.component';

@NgModule({
  declarations: [FloatingNavigationComponent],
  exports: [FloatingNavigationComponent],
  imports: [CommonModule, IonicModule, RouterModule],
})
export class FloatingNavigationModule {}
