import { DOCUMENT } from '@angular/common';
import { discardPeriodicTasks, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';

import { LanguageDirectionService } from '../i18n/language-direction.service';
import { WorkoutEngineService } from '../workout-engine/workout-engine.service';
import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import type { WorkoutSession } from './workout-session.model';
import { WorkoutSessionService } from './workout-session.service';

describe('WorkoutSessionService completion integration', () => {
  let service: WorkoutSessionService;
  let workoutEngine: WorkoutEngineService;
  let workoutSetupState: jasmine.SpyObj<WorkoutSetupStateService>;

  beforeEach(() => {
    workoutSetupState = jasmine.createSpyObj<WorkoutSetupStateService>(
      'WorkoutSetupStateService',
      ['prefillFromOnboardingProfile', 'isCompleteSetup', 'getSnapshot'],
    );
    workoutSetupState.prefillFromOnboardingProfile.and.resolveTo({
      workoutType: 'strength',
      durationMinutes: 10,
      coachingTone: 'supportive',
      mainGoal: 'stay focused',
    });
    workoutSetupState.isCompleteSetup.and.returnValue(true);
    workoutSetupState.getSnapshot.and.returnValue({
      workoutType: 'strength',
      durationMinutes: 10,
      coachingTone: 'supportive',
      mainGoal: 'stay focused',
    });

    TestBed.configureTestingModule({
      providers: [
        WorkoutSessionService,
        WorkoutEngineService,
        LanguageDirectionService,
        { provide: WorkoutSetupStateService, useValue: workoutSetupState },
        { provide: DOCUMENT, useValue: document },
      ],
    });

    service = TestBed.inject(WorkoutSessionService);
    workoutEngine = TestBed.inject(WorkoutEngineService);
  });

  afterEach(() => {
    workoutEngine.reset();
  });

  it('initializes and starts the engine once for a new Session', fakeAsync(() => {
    const initializeSpy = spyOn(workoutEngine, 'initialize').and.callThrough();
    const startSpy = spyOn(workoutEngine, 'start').and.callThrough();

    initializeSession();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(workoutEngine.getSnapshot()?.status).toBe('running');
    cleanupTimers();
  }));

  it('reuses an active Session without recreating its Timeline or restarting the engine', fakeAsync(() => {
    const initializeSpy = spyOn(workoutEngine, 'initialize').and.callThrough();
    const startSpy = spyOn(workoutEngine, 'start').and.callThrough();
    const firstSession = initializeSession();

    tick(1000);
    const reusedSession = initializeSession();

    expect(reusedSession.timeline).toBe(firstSession.timeline);
    expect(reusedSession.startedAt).toEqual(firstSession.startedAt);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledTimes(1);
    cleanupTimers();
  }));

  it('stores manual completion metadata and preserves the Timeline', fakeAsync(() => {
    const activeSession = initializeSession();
    tick(2000);

    const completedSession = expectSession(service.completeCurrentSession());

    expect(completedSession.status).toBe('completed');
    expect(completedSession.actualDurationSeconds).toBe(2);
    expect(completedSession.completedAt).not.toBeNull();
    expect(completedSession.completionReason).toBe('ended_by_user');
    expect(completedSession.timeline).toBe(activeSession.timeline);
    cleanupTimers();
  }));

  it('stores automatic engine completion as timeline_completed', fakeAsync(() => {
    initializeSession();
    workoutEngine.complete('timeline_completed');

    const completedSession = expectSession(service.completeCurrentSession());

    expect(completedSession.status).toBe('completed');
    expect(completedSession.completionReason).toBe('timeline_completed');
    expect(completedSession.completedAt).toEqual(workoutEngine.getSnapshot()?.completedAt ?? null);
    cleanupTimers();
  }));

  it('does not overwrite terminal Session metadata on repeated completion', fakeAsync(() => {
    initializeSession();
    tick(1000);
    const firstCompletion = expectSession(service.completeCurrentSession());

    tick(3000);
    const repeatedCompletion = expectSession(service.completeCurrentSession());

    expect(repeatedCompletion.actualDurationSeconds).toBe(firstCompletion.actualDurationSeconds);
    expect(repeatedCompletion.completedAt).toEqual(firstCompletion.completedAt);
    expect(repeatedCompletion.completionReason).toBe(firstCompletion.completionReason);
    cleanupTimers();
  }));

  it('clearing the Session also resets the engine', fakeAsync(() => {
    initializeSession();

    service.clearSession();

    expect(service.getCurrentSession()).toBeNull();
    expect(workoutEngine.getSnapshot()).toBeNull();
    cleanupTimers();
  }));

  function initializeSession(): WorkoutSession {
    let session: WorkoutSession | null = null;

    service.initializeFromSetup().then((initializedSession) => {
      session = initializedSession;
    });
    flushMicrotasks();

    return expectSession(session);
  }

  function expectSession(session: WorkoutSession | null): WorkoutSession {
    if (!session) {
      fail('Expected a Workout Session.');
      throw new Error('Expected a Workout Session.');
    }

    return session;
  }

  function cleanupTimers(): void {
    workoutEngine.reset();
    discardPeriodicTasks();
  }
});
