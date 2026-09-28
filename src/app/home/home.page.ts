import { Component, inject } from '@angular/core';
import { catchError, from, map, of, switchMap, timer } from 'rxjs';

import { AuthService } from '../core/auth/auth.service';
import { OnboardingProfileService } from '../core/onboarding/onboarding-profile.service';

type GreetingIcon = 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline';

interface HomeGreeting {
  icon: GreetingIcon;
  text: string;
}

interface DailyQuote {
  person: string;
  quote: string;
}

const DAILY_QUOTES: DailyQuote[] = [
  {
    quote: '"Act as if what you do makes a difference. It does."',
    person: 'William James',
  },
  {
    quote: '"It always seems impossible until it\'s done."',
    person: 'Nelson Mandela',
  },
  {
    quote: '"Nothing will work unless you do."',
    person: 'Maya Angelou',
  },
  {
    quote: '"Do what you can, with what you have, where you are."',
    person: 'Theodore Roosevelt',
  },
  {
    quote: '"The best way out is always through."',
    person: 'Robert Frost',
  },
  {
    quote: '"If there is no struggle, there is no progress."',
    person: 'Frederick Douglass',
  },
  {
    quote: '"First say to yourself what you would be; and then do what you have to do."',
    person: 'Epictetus',
  },
];

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

  readonly dailyQuote$ = timer(0, 60_000).pipe(
    map(() => this.getDailyQuote()),
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

  private getDailyQuote(): DailyQuote {
    const today = new Date();
    const dayIndex = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000);

    return DAILY_QUOTES[dayIndex % DAILY_QUOTES.length];
  }
}
