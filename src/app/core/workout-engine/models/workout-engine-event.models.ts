import type { WorkoutEngineRuntimeStatus } from './workout-engine-runtime.models';
import type {
  WorkoutAudioId,
  WorkoutBoostId,
  WorkoutCompletionId,
  WorkoutCueId,
  WorkoutStepId,
  WorkoutTimelineId,
} from './workout-timeline.models';

export type WorkoutEngineEventType =
  | 'timeline-loaded'
  | 'runtime-status-changed'
  | 'workout-started'
  | 'workout-paused'
  | 'workout-resumed'
  | 'workout-cancelled'
  | 'step-started'
  | 'step-completed'
  | 'cue-presented'
  | 'cue-missed'
  | 'audio-started'
  | 'audio-ended'
  | 'boost-started'
  | 'boost-ended'
  | 'completion-reached'
  | 'engine-error';

export interface WorkoutEngineEventBase {
  type: WorkoutEngineEventType;
  timelineId: WorkoutTimelineId;
  occurredAt: Date;
}

export type WorkoutEngineEvent =
  | WorkoutTimelineLoadedEvent
  | WorkoutRuntimeStatusChangedEvent
  | WorkoutStartedEvent
  | WorkoutPausedEvent
  | WorkoutResumedEvent
  | WorkoutCancelledEvent
  | WorkoutStepStartedEvent
  | WorkoutStepCompletedEvent
  | WorkoutCuePresentedEvent
  | WorkoutCueMissedEvent
  | WorkoutAudioStartedEvent
  | WorkoutAudioEndedEvent
  | WorkoutBoostStartedEvent
  | WorkoutBoostEndedEvent
  | WorkoutCompletionReachedEvent
  | WorkoutEngineErrorEvent;

export interface WorkoutTimelineLoadedEvent extends WorkoutEngineEventBase {
  type: 'timeline-loaded';
}

export interface WorkoutRuntimeStatusChangedEvent extends WorkoutEngineEventBase {
  type: 'runtime-status-changed';
  from: WorkoutEngineRuntimeStatus;
  to: WorkoutEngineRuntimeStatus;
}

export interface WorkoutStartedEvent extends WorkoutEngineEventBase {
  type: 'workout-started';
}

export interface WorkoutPausedEvent extends WorkoutEngineEventBase {
  type: 'workout-paused';
  elapsedSeconds: number;
}

export interface WorkoutResumedEvent extends WorkoutEngineEventBase {
  type: 'workout-resumed';
  elapsedSeconds: number;
}

export interface WorkoutCancelledEvent extends WorkoutEngineEventBase {
  type: 'workout-cancelled';
  reason?: string;
}

export interface WorkoutStepStartedEvent extends WorkoutEngineEventBase {
  type: 'step-started';
  stepId: WorkoutStepId;
}

export interface WorkoutStepCompletedEvent extends WorkoutEngineEventBase {
  type: 'step-completed';
  stepId: WorkoutStepId;
}

export interface WorkoutCuePresentedEvent extends WorkoutEngineEventBase {
  type: 'cue-presented';
  cueId: WorkoutCueId;
  stepId: WorkoutStepId;
}

export interface WorkoutCueMissedEvent extends WorkoutEngineEventBase {
  type: 'cue-missed';
  cueId: WorkoutCueId;
  stepId: WorkoutStepId;
}

export interface WorkoutAudioStartedEvent extends WorkoutEngineEventBase {
  type: 'audio-started';
  audioId: WorkoutAudioId;
}

export interface WorkoutAudioEndedEvent extends WorkoutEngineEventBase {
  type: 'audio-ended';
  audioId: WorkoutAudioId;
}

export interface WorkoutBoostStartedEvent extends WorkoutEngineEventBase {
  type: 'boost-started';
  boostId: WorkoutBoostId;
}

export interface WorkoutBoostEndedEvent extends WorkoutEngineEventBase {
  type: 'boost-ended';
  boostId: WorkoutBoostId;
}

export interface WorkoutCompletionReachedEvent extends WorkoutEngineEventBase {
  type: 'completion-reached';
  completionId: WorkoutCompletionId;
}

export interface WorkoutEngineErrorEvent extends WorkoutEngineEventBase {
  type: 'engine-error';
  message: string;
  recoverable: boolean;
}
