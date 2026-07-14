import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import type { WorkoutSession } from '../core/workout-session/workout-session.model';
import { WorkoutSessionService } from '../core/workout-session/workout-session.service';
import { WorkoutSetupStateService } from '../core/workout-setup/workout-setup-state.service';
import { SummaryPage } from './summary.page';

describe('SummaryPage completed Session integration', () => {
  it('reads the completed Session from WorkoutSessionService', async () => {
    const completedSession = {
      status: 'completed',
      actualDurationSeconds: 42,
      completionReason: 'timeline_completed',
      completedAt: new Date('2026-07-14T12:00:00.000Z'),
    } as WorkoutSession;
    const workoutSessionService = jasmine.createSpyObj<WorkoutSessionService>(
      'WorkoutSessionService',
      ['getCurrentSession', 'clearSession'],
    );
    workoutSessionService.getCurrentSession.and.returnValue(completedSession);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']) },
        { provide: WorkoutSessionService, useValue: workoutSessionService },
        {
          provide: WorkoutSetupStateService,
          useValue: jasmine.createSpyObj<WorkoutSetupStateService>('WorkoutSetupStateService', ['reset']),
        },
      ],
    });

    const page = TestBed.runInInjectionContext(() => new SummaryPage());

    await page.ionViewWillEnter();

    expect(page.session).toBe(completedSession);
  });
});
