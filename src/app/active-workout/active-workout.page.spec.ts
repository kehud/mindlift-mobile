import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';

import type { WorkoutEngineRuntimeSnapshot } from '../core/workout-engine/models/workout-engine-runtime.models';
import { WorkoutEngineService } from '../core/workout-engine/workout-engine.service';
import { WorkoutHistoryService } from '../core/workout-history/workout-history.service';
import type { WorkoutSession } from '../core/workout-session/workout-session.model';
import { WorkoutSessionService } from '../core/workout-session/workout-session.service';
import { ActiveWorkoutPage } from './active-workout.page';

describe('ActiveWorkoutPage automatic completion integration', () => {
  let fixture: ComponentFixture<ActiveWorkoutPage>;
  let router: jasmine.SpyObj<Router>;
  let workoutHistoryService: jasmine.SpyObj<WorkoutHistoryService>;
  let workoutSessionService: jasmine.SpyObj<WorkoutSessionService>;
  let engineSnapshot: WritableSignal<WorkoutEngineRuntimeSnapshot | null>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);
    workoutHistoryService = jasmine.createSpyObj<WorkoutHistoryService>(
      'WorkoutHistoryService',
      ['saveCompletedWorkout'],
    );
    workoutHistoryService.saveCompletedWorkout.and.resolveTo();
    workoutSessionService = jasmine.createSpyObj<WorkoutSessionService>(
      'WorkoutSessionService',
      ['initializeFromSetup', 'completeCurrentSession'],
    );
    workoutSessionService.completeCurrentSession.and.returnValue({ status: 'completed' } as WorkoutSession);
    engineSnapshot = signal<WorkoutEngineRuntimeSnapshot | null>(null);

    await TestBed.configureTestingModule({
      declarations: [ActiveWorkoutPage],
      providers: [
        { provide: Router, useValue: router },
        { provide: WorkoutEngineService, useValue: { snapshot: engineSnapshot } },
        { provide: WorkoutHistoryService, useValue: workoutHistoryService },
        { provide: WorkoutSessionService, useValue: workoutSessionService },
      ],
    })
      .overrideComponent(ActiveWorkoutPage, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutPage);
    fixture.detectChanges();
  });

  it('navigates to Summary only once when the engine completes automatically', fakeAsync(() => {
    engineSnapshot.set(createCompletedSnapshot());
    fixture.detectChanges();
    tick();

    engineSnapshot.set(createCompletedSnapshot());
    fixture.detectChanges();
    tick();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/summary');
  }));
});

function createCompletedSnapshot(): WorkoutEngineRuntimeSnapshot {
  return {
    status: 'completed',
    activeStepId: null,
    activeCueId: null,
    currentCue: null,
    elapsedSeconds: 120,
    remainingSeconds: 0,
    completedAt: new Date('2026-07-14T12:00:00.000Z'),
    completionReason: 'timeline_completed',
    processedCueIds: [],
    playedCueIds: [],
    missedCueIds: [],
  };
}
