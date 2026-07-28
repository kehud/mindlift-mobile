import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ProfileSettingsPageRoutingModule } from './profile-settings-routing.module';
import { ProfileSettingsPage } from './profile-settings.page';
import { FloatingNavigationModule } from '../shared/floating-navigation/floating-navigation.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfileSettingsPageRoutingModule,
    FloatingNavigationModule,
  ],
  declarations: [ProfileSettingsPage]
})
export class ProfileSettingsPageModule {}
