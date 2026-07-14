import type { MindLiftLanguage } from '../../i18n/language-direction.service';
import type {
  CoachingTone,
  WorkoutDuration,
  WorkoutType,
} from '../../workout-setup/workout-setup-options';

export type WorkoutTimelineId = string;
export type WorkoutTimelineVersion = number;
export type WorkoutStepId = string;
export type WorkoutCueId = string;
export type WorkoutAudioId = string;
export type WorkoutBoostId = string;
export type WorkoutCompletionId = string;

export type WorkoutTimelineSource = 'generated' | 'template' | 'manual';

export type WorkoutStepType =
  | 'warmup'
  | 'work'
  | 'recovery'
  | 'rest'
  | 'cooldown'
  | 'reflection';

export type WorkoutStepCompletionType =
  | 'duration'
  | 'repetitions'
  | 'breaths'
  | 'user-confirmed';

export type WorkoutCueChannel = 'visual' | 'spoken' | 'haptic';
export type WorkoutCueCategory = 'focus' | 'mental' | 'motivation' | 'reflection';
export type WorkoutCueTiming = 'before-step' | 'during-step' | 'after-step';
export type WorkoutCuePriority = 'low' | 'normal' | 'high';
export type WorkoutAudioRole = 'voice' | 'music' | 'ambient' | 'sound-effect';
export type WorkoutBoostType = 'energy' | 'focus' | 'form' | 'recovery';
export type WorkoutBoostTrigger = 'manual' | 'low-energy' | 'missed-step' | 'scheduled';
export type WorkoutCompletionStatus = 'completed' | 'stopped' | 'skipped';

export interface WorkoutTimeline {
  id: WorkoutTimelineId;
  version: WorkoutTimelineVersion;
  source: WorkoutTimelineSource;
  workoutType: WorkoutType;
  durationMinutes: WorkoutDuration;
  coachingTone: CoachingTone;
  language: MindLiftLanguage;
  title: string;
  mainGoal: string;
  totalDurationSeconds: number;
  steps: readonly WorkoutStep[];
  cues: readonly WorkoutCue[];
  audio: readonly WorkoutAudio[];
  boosts: readonly WorkoutBoost[];
  completion: WorkoutCompletion;
  createdAt: Date;
}

export interface WorkoutStep {
  id: WorkoutStepId;
  type: WorkoutStepType;
  title: string;
  instructions: string;
  startOffsetSeconds: number;
  durationSeconds: number;
  cueIds: readonly WorkoutCueId[];
  audioIds: readonly WorkoutAudioId[];
  completion: WorkoutStepCompletion;
}

export interface WorkoutStepCompletion {
  type: WorkoutStepCompletionType;
  targetSeconds?: number;
  targetRepetitions?: number;
  targetBreaths?: number;
}

export interface WorkoutCue {
  id: WorkoutCueId;
  stepId: WorkoutStepId;
  templateId?: string;
  category: WorkoutCueCategory;
  channel: WorkoutCueChannel;
  timing: WorkoutCueTiming;
  priority: WorkoutCuePriority;
  text: string;
  offsetSeconds: number;
  audioId?: WorkoutAudioId;
}

export interface WorkoutAudio {
  id: WorkoutAudioId;
  role: WorkoutAudioRole;
  sourceUrl: string;
  durationSeconds?: number;
  transcript?: string;
  cueId?: WorkoutCueId;
}

export interface WorkoutBoost {
  id: WorkoutBoostId;
  type: WorkoutBoostType;
  trigger: WorkoutBoostTrigger;
  cueIds: readonly WorkoutCueId[];
  audioIds: readonly WorkoutAudioId[];
  durationSeconds?: number;
}

export interface WorkoutCompletion {
  id: WorkoutCompletionId;
  status: WorkoutCompletionStatus;
  title: string;
  summary: string;
  cueIds: readonly WorkoutCueId[];
  audioIds: readonly WorkoutAudioId[];
}
