import { DOCUMENT } from '@angular/common';
import { discardPeriodicTasks, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';

import { LanguageDirectionService } from '../i18n/language-direction.service';
import { WorkoutAudioAdapter } from '../workout-engine/workout-audio.adapter';
import { WorkoutEngineService } from '../workout-engine/workout-engine.service';
import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import type { WorkoutSession } from './workout-session.model';
import { WorkoutSessionService } from './workout-session.service';

describe('WorkoutSessionService completion integration', () => {
  let service: WorkoutSessionService;
  let workoutEngine: WorkoutEngineService;
  let workoutAudio: jasmine.SpyObj<WorkoutAudioAdapter>;
  let workoutSetupState: jasmine.SpyObj<WorkoutSetupStateService>;

  beforeEach(() => {
    workoutAudio = jasmine.createSpyObj<WorkoutAudioAdapter>(
      'WorkoutAudioAdapter', ['handlePresentedCue', 'pause', 'resume', 'stop', 'reset'],
    );
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
        { provide: WorkoutAudioAdapter, useValue: workoutAudio },
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

  it('generates Hebrew calm content with the female warm-up recording while the UI stays English', fakeAsync(() => {
    const languageDirection = TestBed.inject(LanguageDirectionService);
    const setup = { ...workoutSetupState.getSnapshot(), coachingTone: 'calm' as const };
    workoutSetupState.prefillFromOnboardingProfile.and.resolveTo(setup);
    workoutSetupState.getSnapshot.and.returnValue(setup);

    expect(languageDirection.getCurrentLanguage()).toBe('en');

    const session = initializeSession();
    const opening = session.timeline.cues[0];
    const audio = session.timeline.audio.find((candidate) => candidate.id === opening.audioId);

    expect(session.timeline.language).toBe('he');
    expect(session.timeline.coachingTone).toBe('calm');
    expect(session.timeline.workoutType).toBe(setup.workoutType!);
    expect(session.timeline.steps[0].type).toBe('warmup');
    expect(opening.templateId).toBe('female_relaxed_warmup_01');
    expect(opening.text).toBe('הגעת לאימון, זה כבר הניצחון הראשון שלך.');
    expect(opening.offsetSeconds).toBe(0);
    expect(opening.audioId).toBeDefined();
    expect(audio).toEqual(jasmine.objectContaining({
      voiceKey: 'female',
      sourceUrl: 'assets/audio/female/relaxed/warmup/female_relaxed_warmup_01.mp3',
      cueId: opening.id,
    }));
    expect(languageDirection.getCurrentLanguage()).toBe('en');
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

  it('forwards resolved audio once and follows engine pause/resume without replaying on reuse', fakeAsync(() => {
    workoutSetupState.getSnapshot.and.returnValue({
      ...workoutSetupState.getSnapshot(), coachingTone: 'calm',
    });
    const session = initializeSession();
    TestBed.tick();
    expect(workoutAudio.handlePresentedCue).toHaveBeenCalledOnceWith(
      session.timeline.cues[0], session.timeline.audio[0],
    );

    workoutAudio.pause.calls.reset();
    workoutAudio.resume.calls.reset();
    workoutEngine.pause();
    TestBed.tick();
    expect(workoutAudio.pause).toHaveBeenCalledTimes(1);
    workoutEngine.resume();
    TestBed.tick();
    expect(workoutAudio.resume).toHaveBeenCalledTimes(1);
    initializeSession();
    TestBed.tick();
    expect(workoutAudio.handlePresentedCue).toHaveBeenCalledTimes(1);
    expect(workoutAudio.reset).toHaveBeenCalledTimes(1);
    cleanupTimers();
  }));

  it('stops audio on finish and forwards the opening again in a new session', fakeAsync(() => {
    initializeSession();
    TestBed.tick();
    workoutAudio.stop.calls.reset();
    service.completeCurrentSession();
    expect(workoutAudio.stop).toHaveBeenCalled();
    initializeSession();
    TestBed.tick();
    expect(workoutAudio.handlePresentedCue).toHaveBeenCalledTimes(2);
    expect(workoutAudio.reset).toHaveBeenCalledTimes(2);
    cleanupTimers();
  }));

  it('stops audio on automatic completion and direct engine reset', fakeAsync(() => {
    initializeSession();
    TestBed.tick();
    workoutAudio.stop.calls.reset();
    workoutEngine.complete('timeline_completed');
    TestBed.tick();
    expect(workoutAudio.stop).toHaveBeenCalled();
    workoutAudio.stop.calls.reset();
    workoutEngine.reset();
    TestBed.tick();
    expect(workoutAudio.stop).toHaveBeenCalled();
    cleanupTimers();
  }));

  it('releases audio on session clear and service cleanup', fakeAsync(() => {
    initializeSession();
    TestBed.tick();
    workoutAudio.reset.calls.reset();
    service.clearSession();
    expect(workoutAudio.reset).toHaveBeenCalledTimes(1);
    service.ngOnDestroy();
    expect(workoutAudio.reset).toHaveBeenCalledTimes(2);
    cleanupTimers();
  }));

  it('does not forward missed cues to the audio adapter', fakeAsync(() => {
    spyOn(window, 'setInterval').and.returnValue(1);
    initializeSession();
    TestBed.tick();
    workoutAudio.handlePresentedCue.calls.reset();
    tick(181000);
    workoutEngine.syncAfterBackground();
    TestBed.tick();
    expect(workoutEngine.cueEvents().some((event) => event.type === 'cue-missed')).toBeTrue();
    expect(workoutAudio.handlePresentedCue).not.toHaveBeenCalled();
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
