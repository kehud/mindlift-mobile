import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';
import { OnboardingProfileService } from './onboarding-profile.service';

export const onboardingCompleteGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const onboardingProfileService = inject(OnboardingProfileService);
  const router = inject(Router);

  return authService.authInitializationComplete$.pipe(
    take(1),
    switchMap(() => authService.currentUser$.pipe(take(1))),
    switchMap((user) => {
      console.info('Onboarding guard evaluated after auth initialization.', {
        authenticated: Boolean(user),
      });

      if (!user) {
        return of(true);
      }

      return from(onboardingProfileService.loadProfile(user.uid)).pipe(
        map((profile) => profile?.completedAt ? true : router.createUrlTree(['/onboarding/about'])),
        catchError((error: unknown) => {
          console.error('Failed to verify onboarding completion.', error);

          return of(router.createUrlTree(['/onboarding/about']));
        }),
      );
    }),
  );
};
