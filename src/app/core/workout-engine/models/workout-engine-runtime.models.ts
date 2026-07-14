import type {
  WorkoutAudioId,
  WorkoutBoostId,
  WorkoutCue,
  WorkoutCueId,
  WorkoutStepId,
  WorkoutTimeline,
  WorkoutTimelineId,
} from './workout-timeline.models';

export type WorkoutEngineRuntimeStatus =
  | 'idle'
  | 'ready'
  | 'running'
  | 'paused'
  | 'boosting'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface WorkoutEngineRuntime {
  timelineId: WorkoutTimelineId;
  timeline: WorkoutTimeline;
  status: WorkoutEngineRuntimeStatus;
  activeStepId: WorkoutStepId | null;
  activeCueId: WorkoutCueId | null;
  activeAudioId: WorkoutAudioId | null;
  activeBoostId: WorkoutBoostId | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  startedAt: Date | null;
  pausedAt: Date | null;
  resumedAt: Date | null;
  completedAt: Date | null;
  processedCueIds: readonly WorkoutCueId[];
  playedCueIds: readonly WorkoutCueId[];
  missedCueIds: readonly WorkoutCueId[];
  playedAudioIds: readonly WorkoutAudioId[];
  completedStepIds: readonly WorkoutStepId[];
}

export interface WorkoutEngineRuntimeSnapshot {
  status: WorkoutEngineRuntimeStatus;
  activeStepId: WorkoutStepId | null;
  activeCueId: WorkoutCueId | null;
  currentCue: WorkoutCue | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  processedCueIds: readonly WorkoutCueId[];
  playedCueIds: readonly WorkoutCueId[];
  missedCueIds: readonly WorkoutCueId[];
}
