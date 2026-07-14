import { discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';

import type { WorkoutEngineRuntimeSnapshot } from './models/workout-engine-runtime.models';
import type {
  WorkoutCue,
  WorkoutCueCategory,
  WorkoutStep,
  WorkoutTimeline,
} from './models/workout-timeline.models';
import { WORKOUT_MISSED_CUE_THRESHOLD_SECONDS } from './workout-timeline-generation.constants';
import { WorkoutEngineService } from './workout-engine.service';

describe('WorkoutEngineService', () => {
  let service: WorkoutEngineService;

  beforeEach(() => {
    service = new WorkoutEngineService();
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('initialize creates an idle runtime', fakeAsync(() => {
    service.initialize(createTimeline());

    const snapshot = expectSnapshot();

    expect(snapshot.status).toBe('idle');
    expect(snapshot.elapsedSeconds).toBe(0);
    expect(snapshot.remainingSeconds).toBe(120);
    expect(snapshot.currentCue).toBeNull();
    expect(snapshot.processedCueIds).toEqual([]);
    expect(snapshot.playedCueIds).toEqual([]);
    expect(snapshot.missedCueIds).toEqual([]);
    cleanupTimers();
  }));

  it('start moves idle to running', fakeAsync(() => {
    service.initialize(createTimeline());

    service.start();

    expect(expectSnapshot().status).toBe('running');
    cleanupTimers();
  }));

  it('repeated start is a no-op', fakeAsync(() => {
    const setIntervalSpy = spyOn(window, 'setInterval').and.callThrough();

    service.initialize(createTimeline([
      createCue('opening-cue', 0, 'opening-step'),
    ]));

    service.start();
    service.start();

    const snapshot = expectSnapshot();

    expect(snapshot.status).toBe('running');
    expect(setIntervalSpy.calls.count()).toBe(1);
    expect(snapshot.playedCueIds).toEqual(['opening-cue']);
    cleanupTimers();
  }));

  it('pause freezes elapsed time', fakeAsync(() => {
    service.initialize(createTimeline());
    service.start();

    tick(3000);
    service.pause();
    tick(7000);

    expect(expectSnapshot().status).toBe('paused');
    expect(expectSnapshot().elapsedSeconds).toBe(3);
    cleanupTimers();
  }));

  it('resume continues from the frozen elapsed time', fakeAsync(() => {
    service.initialize(createTimeline());
    service.start();

    tick(2000);
    service.pause();
    tick(8000);
    service.resume();
    tick(2000);

    const snapshot = expectSnapshot();

    expect(snapshot.status).toBe('running');
    expect(snapshot.elapsedSeconds).toBe(4);
    cleanupTimers();
  }));

  it('reset clears runtime and timer state', fakeAsync(() => {
    const clearIntervalSpy = spyOn(window, 'clearInterval').and.callThrough();

    service.initialize(createTimeline());
    service.start();

    service.reset();

    expect(service.getSnapshot()).toBeNull();
    expect(service.cueEvents()).toEqual([]);
    expect(clearIntervalSpy.calls.count()).toBe(1);
    cleanupTimers();
  }));

  it('only creates one tick loop', fakeAsync(() => {
    const setIntervalSpy = spyOn(window, 'setInterval').and.callThrough();

    service.initialize(createTimeline());

    service.start();
    service.start();
    service.resume();

    expect(setIntervalSpy.calls.count()).toBe(1);
    cleanupTimers();
  }));

  it('presents the opening cue once', fakeAsync(() => {
    service.initialize(createTimeline([
      createCue('opening-cue', 0, 'opening-step'),
    ]));

    service.start();
    tick(1000);

    expect(expectSnapshot().playedCueIds).toEqual(['opening-cue']);
    expect(service.cueEvents().filter((event) => event.type === 'cue-presented').length).toBe(1);
    expect(service.currentCue()?.id).toBe('opening-cue');
    cleanupTimers();
  }));

  it('never processes a cue twice', fakeAsync(() => {
    service.initialize(createTimeline([
      createCue('opening-cue', 0, 'opening-step'),
    ]));

    service.start();
    tick(2000);

    const snapshot = expectSnapshot();

    expect(snapshot.processedCueIds).toEqual(['opening-cue']);
    expect(snapshot.playedCueIds).toEqual(['opening-cue']);
    expect(service.cueEvents().length).toBe(1);
    cleanupTimers();
  }));

  it('marks an overdue cue as missed', fakeAsync(() => {
    service.initialize(createTimeline([
      createCue('late-cue', -(WORKOUT_MISSED_CUE_THRESHOLD_SECONDS + 1), 'opening-step'),
    ]));

    service.start();

    const snapshot = expectSnapshot();

    expect(snapshot.playedCueIds).toEqual([]);
    expect(snapshot.missedCueIds).toEqual(['late-cue']);
    expect(snapshot.processedCueIds).toEqual(['late-cue']);
    expect(service.cueEvents()[0].type).toBe('cue-missed');
    cleanupTimers();
  }));

  it('misses older eligible cues and presents only the latest one', fakeAsync(() => {
    service.initialize(createTimeline([
      createCue('cue-1', -2, 'opening-step'),
      createCue('cue-2', -1, 'opening-step'),
      createCue('cue-3', 0, 'opening-step'),
    ]));

    service.start();

    const snapshot = expectSnapshot();

    expect(snapshot.missedCueIds).toEqual(['cue-1', 'cue-2']);
    expect(snapshot.playedCueIds).toEqual(['cue-3']);
    expect(snapshot.activeCueId).toBe('cue-3');
    expect(service.cueEvents().map((event) => event.type))
      .toEqual(['cue-missed', 'cue-missed', 'cue-presented']);
    cleanupTimers();
  }));

  it('updates the current Timeline step from elapsed time', fakeAsync(() => {
    service.initialize(createTimeline());
    service.start();

    expect(expectSnapshot().activeStepId).toBe('opening-step');

    tick(12000);
    expect(expectSnapshot().activeStepId).toBe('work-step');

    tick(43000);
    expect(expectSnapshot().activeStepId).toBe('closing-step');
    cleanupTimers();
  }));

  it('pause stops cue processing', fakeAsync(() => {
    service.initialize(createTimeline([
      createCue('paused-cue', 2, 'opening-step'),
    ]));
    service.start();

    service.pause();
    tick(5000);

    expect(expectSnapshot().processedCueIds).toEqual([]);
    expect(service.cueEvents()).toEqual([]);
    cleanupTimers();
  }));

  it('resume restarts cue processing', fakeAsync(() => {
    const setIntervalSpy = spyOn(window, 'setInterval').and.callThrough();

    service.initialize(createTimeline([
      createCue('resumed-cue', 2, 'opening-step'),
    ]));
    service.start();
    service.pause();

    tick(5000);
    service.resume();
    tick(3000);

    expect(setIntervalSpy.calls.count()).toBe(2);
    expect(expectSnapshot().playedCueIds).toEqual(['resumed-cue']);
    cleanupTimers();
  }));

  it('initialize clears a previous timer and runtime', fakeAsync(() => {
    const clearIntervalSpy = spyOn(window, 'clearInterval').and.callThrough();

    service.initialize(createTimeline([
      createCue('previous-cue', 0, 'opening-step'),
    ]));
    service.start();

    service.initialize(createTimeline([], { id: 'replacement-timeline', totalDurationSeconds: 30 }));

    const snapshot = expectSnapshot();

    expect(clearIntervalSpy.calls.count()).toBe(1);
    expect(snapshot.status).toBe('idle');
    expect(snapshot.remainingSeconds).toBe(30);
    expect(snapshot.playedCueIds).toEqual([]);
    expect(service.cueEvents()).toEqual([]);
    cleanupTimers();
  }));

  it('service destruction clears timer resources', fakeAsync(() => {
    const clearIntervalSpy = spyOn(window, 'clearInterval').and.callThrough();

    service.initialize(createTimeline());
    service.start();

    service.ngOnDestroy();

    expect(clearIntervalSpy.calls.count()).toBe(1);
    cleanupTimers();
  }));

  function cleanupTimers(): void {
    service.ngOnDestroy();
    discardPeriodicTasks();
  }

  function expectSnapshot(): WorkoutEngineRuntimeSnapshot {
    const snapshot = service.getSnapshot();

    if (!snapshot) {
      fail('Expected WorkoutEngineService snapshot to exist.');
      throw new Error('Expected WorkoutEngineService snapshot to exist.');
    }

    return snapshot;
  }
});

function createTimeline(
  cues: readonly WorkoutCue[] = [],
  overrides: Partial<WorkoutTimeline> = {},
): WorkoutTimeline {
  const steps = createSteps();

  return {
    id: 'test-timeline',
    version: 1,
    source: 'generated',
    workoutType: 'strength',
    durationMinutes: 10,
    coachingTone: 'supportive',
    language: 'en',
    title: 'Test Timeline',
    mainGoal: 'stay focused',
    totalDurationSeconds: 120,
    steps,
    cues,
    audio: [],
    boosts: [],
    completion: {
      id: 'completion',
      status: 'completed',
      title: 'Complete',
      summary: 'Done',
      cueIds: [],
      audioIds: [],
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createSteps(): readonly WorkoutStep[] {
  return [
    {
      id: 'opening-step',
      type: 'warmup',
      title: 'Opening',
      instructions: 'Open',
      startOffsetSeconds: 0,
      durationSeconds: 10,
      cueIds: [],
      audioIds: [],
      completion: {
        type: 'duration',
        targetSeconds: 10,
      },
    },
    {
      id: 'work-step',
      type: 'work',
      title: 'Work',
      instructions: 'Work',
      startOffsetSeconds: 10,
      durationSeconds: 40,
      cueIds: [],
      audioIds: [],
      completion: {
        type: 'duration',
        targetSeconds: 40,
      },
    },
    {
      id: 'closing-step',
      type: 'cooldown',
      title: 'Closing',
      instructions: 'Close',
      startOffsetSeconds: 50,
      durationSeconds: 70,
      cueIds: [],
      audioIds: [],
      completion: {
        type: 'duration',
        targetSeconds: 70,
      },
    },
  ];
}

function createCue(
  id: string,
  offsetSeconds: number,
  stepId: string,
  category: WorkoutCueCategory = 'focus',
): WorkoutCue {
  return {
    id,
    stepId,
    category,
    channel: 'visual',
    timing: 'during-step',
    priority: 'normal',
    text: id,
    offsetSeconds,
  };
}
