import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';

import type { WorkoutEngineRuntimeSnapshot } from '../core/workout-engine/models/workout-engine-runtime.models';
import { generateWorkoutTimeline } from '../core/workout-engine/workout-timeline-generator';
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
      imports: [CommonModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useValue: router },
        { provide: WorkoutEngineService, useValue: { snapshot: engineSnapshot } },
        { provide: WorkoutHistoryService, useValue: workoutHistoryService },
        { provide: WorkoutSessionService, useValue: workoutSessionService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveWorkoutPage);
    fixture.detectChanges();
  });

  it('shows the active phase labels while the timer and progress use the full duration', async () => {
    const timeline = generateWorkoutTimeline({
      workoutType: 'strength', durationMinutes: 10, plannedDurationSeconds: 600,
      coachingTone: 'calm', language: 'he', mainGoal: 'stay focused',
    }, []);
    workoutSessionService.initializeFromSetup.and.resolveTo({
      workoutType: 'strength', durationMinutes: 10, coachingTone: 'calm', mainGoal: 'stay focused',
      timeline, startedAt: new Date(), actualDurationSeconds: null, completedAt: null,
      completionReason: null, status: 'active',
    });
    const snapshot: WorkoutEngineRuntimeSnapshot = {
      ...createCompletedSnapshot(), status: 'running', completedAt: null, completionReason: null,
      elapsedSeconds: 59, remainingSeconds: 541, activeStepId: timeline.steps[0].id,
      currentCue: timeline.cues[0],
    };
    engineSnapshot.set(snapshot);
    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const label = host.querySelector<HTMLElement>('.cue-kicker')!;
    expect(host.querySelector('.phase-row span')?.textContent?.trim()).toBe('Warm-up');
    expect(label.textContent?.trim()).toBe('Warm-up');
    expect(getComputedStyle(label).textTransform).toBe('uppercase');
    expect(host.querySelector('.workout-timer')?.textContent?.trim()).toBe('9:01');

    // No new cue is needed for the phase label to change at the boundary.
    engineSnapshot.set({
      ...snapshot, elapsedSeconds: 60, remainingSeconds: 540, activeStepId: timeline.steps[1].id,
    });
    fixture.detectChanges();
    expect(host.querySelector('.phase-row span')?.textContent?.trim()).toBe('Workout');
    expect(label.textContent?.trim()).toBe('Workout');
    expect(host.querySelector('.phase-row span:last-child')?.textContent?.trim()).toBe('Finish');
    expect(host.querySelector('.workout-timer')?.textContent?.trim()).toBe('9:00');
    expect(host.querySelector('.progress-track')?.getAttribute('aria-valuenow')).toBe('10');
  });

  it('automatically directs Hebrew and English cue text while keeping it centered in an LTR interface', () => {
    const component = fixture.componentInstance;
    const host: HTMLElement = fixture.nativeElement;
    host.setAttribute('dir', 'ltr');
    component.isLoading.set(false);
    spyOn(component, 'hasSession').and.returnValue(true);
    const cueContent = spyOn(component, 'cueContent').and.returnValue({
      title: 'Opening', text: 'הגעת לאימון, זה כבר הניצחון הראשון שלך.',
    });
    fixture.detectChanges();

    const cue = host.querySelector<HTMLElement>('.cue-copy')!;
    expect(cue.getAttribute('dir')).toBe('auto');
    expect(cue.textContent?.trim()).toBe('הגעת לאימון, זה כבר הניצחון הראשון שלך.');
    expect(getComputedStyle(cue).direction).toBe('rtl');
    expect(getComputedStyle(cue).textAlign).toBe('center');

    cueContent.and.returnValue({ title: 'Opening', text: 'Begin with your goal in mind.' });
    fixture.detectChanges();
    expect(cue.textContent?.trim()).toBe('Begin with your goal in mind.');
    expect(getComputedStyle(cue).direction).toBe('ltr');
    expect(getComputedStyle(cue).textAlign).toBe('center');
    expect(getComputedStyle(cue.parentElement!).direction).toBe('ltr');
    expect(host.querySelectorAll('[dir]').length).toBe(1);
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
