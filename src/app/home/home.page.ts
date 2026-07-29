import { Component, inject } from '@angular/core';
import { catchError, from, map, of, switchMap, timer } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { OnboardingProfileService } from '../core/onboarding/onboarding-profile.service';

type GreetingIcon = 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline';

interface HomeGreeting {
  icon: GreetingIcon;
  text: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  private readonly authService = inject(AuthService);
  private readonly onboardingProfileService = inject(OnboardingProfileService);

  readonly greeting$ = this.authService.currentUser$.pipe(
    switchMap((user) => {
      if (!user) {
        return of<string | null>(null);
      }

      return from(this.onboardingProfileService.loadProfile(user.uid)).pipe(
        map((profile) => this.getFirstName(profile?.displayName)),
        catchError(() => of<string | null>(null)),
      );
    }),
    switchMap((firstName) => timer(0, 60_000).pipe(
      map(() => this.getGreeting(firstName)),
    )),
  );

  private getFirstName(displayName: string | null | undefined): string | null {
    return displayName?.trim().split(/\s+/)[0] || null;
  }

  private getGreeting(firstName: string | null): HomeGreeting {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return this.withName('Good morning', firstName, 'partly-sunny-outline');
    }

    if (hour >= 12 && hour < 17) {
      return this.withName('Good afternoon', firstName, 'sunny-outline');
    }

    if (hour >= 17 && hour < 21) {
      return this.withName('Good evening', firstName, 'partly-sunny-outline');
    }

    return this.withName('Good night', firstName, 'moon-outline');
  }

  private withName(greeting: string, firstName: string | null, icon: GreetingIcon): HomeGreeting {
    return {
      icon,
      text: firstName ? `${greeting}, ${firstName}` : greeting,
    };
  }
}
