import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-splash',
  templateUrl: 'splash.page.html',
  styleUrls: ['splash.page.scss'],
  standalone: false,
})
export class SplashPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.authService.authInitializationComplete$);
    const user = await firstValueFrom(this.authService.currentUser$);

    try {
      await this.router.navigateByUrl(user ? '/home' : '/login', { replaceUrl: true });
    } catch (error) {
      console.error('Unable to continue from Splash.', error);
    }
  }
}
