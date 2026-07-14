import { computed, Injectable, OnDestroy, signal } from '@angular/core';

import type {
  WorkoutCueMissedEvent,
  WorkoutCuePresentedEvent,
} from './models/workout-engine-event.models';
import type {
  WorkoutEngineRuntime,
  WorkoutEngineRuntimeSnapshot,
} from './models/workout-engine-runtime.models';
import type {
  WorkoutCue,
  WorkoutCueId,
  WorkoutStep,
  WorkoutTimeline,
} from './models/workout-timeline.models';
import { WORKOUT_MISSED_CUE_THRESHOLD_SECONDS } from './workout-timeline-generation.constants';

type WorkoutCueRuntimeEvent = WorkoutCuePresentedEvent | WorkoutCueMissedEvent;

interface CueProcessingResult {
  activeCueId: WorkoutCueId | null;
  processedCueIds: readonly WorkoutCueId[];
  playedCueIds: readonly WorkoutCueId[];
  missedCueIds: readonly WorkoutCueId[];
  events: readonly WorkoutCueRuntimeEvent[];
}

const WORKOUT_ENGINE_TICK_INTERVAL_MS = 1000;

@Injectable({
  providedIn: 'root',
})
export class WorkoutEngineService implements OnDestroy {
  private readonly runtimeState = signal<WorkoutEngineRuntime | null>(null);
  private readonly cueEventsState = signal<readonly WorkoutCueRuntimeEvent[]>([]);

  private tickHandle: ReturnType<typeof setInterval> | null = null;

  readonly snapshot = computed(() => this.createSnapshot(this.runtimeState(), new Date()));
  readonly currentCue = computed(() => this.getCurrentCue(this.runtimeState()));
  readonly cueEvents = this.cueEventsState.asReadonly();

  ngOnDestroy(): void {
    this.stopTicking();
  }

  initialize(timeline: WorkoutTimeline): void {
    this.stopTicking();
    this.cueEventsState.set([]);

    const totalDurationSeconds = this.getTimelineDurationSeconds(timeline);

    this.runtimeState.set({
      timelineId: timeline.id,
      timeline,
      status: 'idle',
      activeStepId: null,
      activeCueId: null,
      activeAudioId: null,
      activeBoostId: null,
      elapsedSeconds: 0,
      remainingSeconds: totalDurationSeconds,
      startedAt: null,
      pausedAt: null,
      resumedAt: null,
      completedAt: null,
      processedCueIds: [],
      playedCueIds: [],
      missedCueIds: [],
      playedAudioIds: [],
      completedStepIds: [],
    });
  }

  start(): void {
    const runtime = this.runtimeState();

    if (!runtime || runtime.status !== 'idle') {
      return;
    }

    const startedAt = new Date();
    const totalDurationSeconds = this.getTimelineDurationSeconds(runtime.timeline);

    this.runtimeState.set({
      ...runtime,
      status: 'running',
      elapsedSeconds: 0,
      remainingSeconds: totalDurationSeconds,
      startedAt,
      pausedAt: null,
      resumedAt: startedAt,
    });
    this.startTicking();
    this.processTick();
  }

  pause(): void {
    const runtime = this.runtimeState();

    if (!runtime || runtime.status !== 'running') {
      return;
    }

    const pausedAt = new Date();
    const elapsedSeconds = this.getElapsedSeconds(runtime, pausedAt);

    this.stopTicking();
    this.runtimeState.set({
      ...runtime,
      status: 'paused',
      elapsedSeconds,
      remainingSeconds: this.getRemainingSeconds(runtime.timeline, elapsedSeconds),
      pausedAt,
      resumedAt: null,
    });
  }

  resume(): void {
    const runtime = this.runtimeState();

    if (!runtime || runtime.status !== 'paused') {
      return;
    }

    const resumedAt = new Date();
    const elapsedSeconds = this.clampElapsedSeconds(runtime.timeline, runtime.elapsedSeconds);

    this.runtimeState.set({
      ...runtime,
      status: 'running',
      elapsedSeconds,
      remainingSeconds: this.getRemainingSeconds(runtime.timeline, elapsedSeconds),
      pausedAt: null,
      resumedAt,
    });
    this.startTicking();
    this.processTick();
  }

  getSnapshot(): WorkoutEngineRuntimeSnapshot | null {
    return this.createSnapshot(this.runtimeState(), new Date());
  }

  reset(): void {
    this.stopTicking();
    this.cueEventsState.set([]);
    this.runtimeState.set(null);
  }

  private processTick(): void {
    const runtime = this.runtimeState();

    if (!runtime || runtime.status !== 'running') {
      this.stopTicking();
      return;
    }

    const tickedAt = new Date();
    const elapsedSeconds = this.getElapsedSeconds(runtime, tickedAt);
    const activeStep = this.getCurrentStep(runtime.timeline, elapsedSeconds);
    const cueProcessing = this.processTimelineCues(runtime, elapsedSeconds, tickedAt);

    this.runtimeState.set({
      ...runtime,
      activeStepId: activeStep?.id ?? null,
      activeCueId: cueProcessing.activeCueId ?? runtime.activeCueId,
      elapsedSeconds,
      remainingSeconds: this.getRemainingSeconds(runtime.timeline, elapsedSeconds),
      resumedAt: tickedAt,
      processedCueIds: cueProcessing.processedCueIds,
      playedCueIds: cueProcessing.playedCueIds,
      missedCueIds: cueProcessing.missedCueIds,
    });

    if (cueProcessing.events.length > 0) {
      this.cueEventsState.set([
        ...this.cueEventsState(),
        ...cueProcessing.events,
      ]);
    }
  }

  private processTimelineCues(
    runtime: WorkoutEngineRuntime,
    elapsedSeconds: number,
    occurredAt: Date,
  ): CueProcessingResult {
    const processedCueIds = new Set(runtime.processedCueIds);
    const passedCues = runtime.timeline.cues
      .filter((cue) => cue.offsetSeconds <= elapsedSeconds && !processedCueIds.has(cue.id))
      .sort((first, second) => first.offsetSeconds - second.offsetSeconds);
    const missedByAge = passedCues.filter((cue) => (
      elapsedSeconds - cue.offsetSeconds > WORKOUT_MISSED_CUE_THRESHOLD_SECONDS
    ));
    const eligibleCues = passedCues.filter((cue) => (
      elapsedSeconds - cue.offsetSeconds <= WORKOUT_MISSED_CUE_THRESHOLD_SECONDS
    ));
    const playableCue = eligibleCues[eligibleCues.length - 1] ?? null;
    const missedCues = [
      ...missedByAge,
      ...(playableCue ? eligibleCues.slice(0, -1) : []),
    ];
    const playedCueIds = playableCue
      ? this.addCueIds(runtime.playedCueIds, [playableCue.id])
      : runtime.playedCueIds;
    const missedCueIds = this.addCueIds(
      runtime.missedCueIds,
      missedCues.map((cue) => cue.id),
    );

    return {
      activeCueId: playableCue?.id ?? null,
      processedCueIds: this.addCueIds(runtime.processedCueIds, [
        ...missedCues.map((cue) => cue.id),
        ...(playableCue ? [playableCue.id] : []),
      ]),
      playedCueIds,
      missedCueIds,
      events: [
        ...missedCues.map((cue) => this.createCueMissedEvent(runtime.timeline, cue, occurredAt)),
        ...(playableCue
          ? [this.createCuePresentedEvent(runtime.timeline, playableCue, occurredAt)]
          : []),
      ],
    };
  }

  private createSnapshot(
    runtime: WorkoutEngineRuntime | null,
    at: Date,
  ): WorkoutEngineRuntimeSnapshot | null {
    if (!runtime) {
      return null;
    }

    const elapsedSeconds = this.getElapsedSeconds(runtime, at);
    const currentCue = this.getCurrentCue(runtime);

    return {
      status: runtime.status,
      activeStepId: this.getCurrentStep(runtime.timeline, elapsedSeconds)?.id ?? runtime.activeStepId,
      activeCueId: runtime.activeCueId,
      currentCue,
      elapsedSeconds,
      remainingSeconds: this.getRemainingSeconds(runtime.timeline, elapsedSeconds),
      processedCueIds: runtime.processedCueIds,
      playedCueIds: runtime.playedCueIds,
      missedCueIds: runtime.missedCueIds,
    };
  }

  private getElapsedSeconds(runtime: WorkoutEngineRuntime, at: Date): number {
    const elapsedSeconds = this.clampElapsedSeconds(runtime.timeline, runtime.elapsedSeconds);

    if (runtime.status !== 'running') {
      return elapsedSeconds;
    }

    const segmentStartedAt = runtime.resumedAt ?? runtime.startedAt;

    if (!segmentStartedAt) {
      return elapsedSeconds;
    }

    const activeSeconds = Math.max(
      Math.floor((at.getTime() - segmentStartedAt.getTime()) / 1000),
      0,
    );

    return this.clampElapsedSeconds(runtime.timeline, elapsedSeconds + activeSeconds);
  }

  private getCurrentStep(
    timeline: WorkoutTimeline,
    elapsedSeconds: number,
  ): WorkoutStep | null {
    for (const step of timeline.steps) {
      const stepEndSeconds = step.startOffsetSeconds + step.durationSeconds;

      if (elapsedSeconds >= step.startOffsetSeconds && elapsedSeconds < stepEndSeconds) {
        return step;
      }
    }

    for (let index = timeline.steps.length - 1; index >= 0; index -= 1) {
      if (elapsedSeconds >= timeline.steps[index].startOffsetSeconds) {
        return timeline.steps[index];
      }
    }

    return null;
  }

  private getCurrentCue(runtime: WorkoutEngineRuntime | null): WorkoutCue | null {
    if (!runtime?.activeCueId) {
      return null;
    }

    return runtime.timeline.cues.find((cue) => cue.id === runtime.activeCueId) ?? null;
  }

  private createCuePresentedEvent(
    timeline: WorkoutTimeline,
    cue: WorkoutCue,
    occurredAt: Date,
  ): WorkoutCuePresentedEvent {
    return {
      type: 'cue-presented',
      timelineId: timeline.id,
      occurredAt,
      cueId: cue.id,
      stepId: cue.stepId,
    };
  }

  private createCueMissedEvent(
    timeline: WorkoutTimeline,
    cue: WorkoutCue,
    occurredAt: Date,
  ): WorkoutCueMissedEvent {
    return {
      type: 'cue-missed',
      timelineId: timeline.id,
      occurredAt,
      cueId: cue.id,
      stepId: cue.stepId,
    };
  }

  private addCueIds(
    existingCueIds: readonly WorkoutCueId[],
    cueIds: readonly WorkoutCueId[],
  ): readonly WorkoutCueId[] {
    const nextCueIds = new Set(existingCueIds);

    for (const cueId of cueIds) {
      nextCueIds.add(cueId);
    }

    return [...nextCueIds];
  }

  private startTicking(): void {
    if (this.tickHandle !== null) {
      return;
    }

    this.tickHandle = setInterval(() => this.processTick(), WORKOUT_ENGINE_TICK_INTERVAL_MS);
  }

  private stopTicking(): void {
    if (this.tickHandle === null) {
      return;
    }

    clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  private getRemainingSeconds(timeline: WorkoutTimeline, elapsedSeconds: number): number {
    return Math.max(this.getTimelineDurationSeconds(timeline) - elapsedSeconds, 0);
  }

  private clampElapsedSeconds(timeline: WorkoutTimeline, elapsedSeconds: number): number {
    return Math.min(Math.max(elapsedSeconds, 0), this.getTimelineDurationSeconds(timeline));
  }

  private getTimelineDurationSeconds(timeline: WorkoutTimeline): number {
    return Math.max(Math.floor(timeline.totalDurationSeconds), 0);
  }
}
