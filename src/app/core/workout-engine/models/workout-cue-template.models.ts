import type { MindLiftLanguage } from '../../i18n/language-direction.service';
import type {
  CoachingTone,
  WorkoutType,
} from '../../workout-setup/workout-setup-options';
import type {
  WorkoutAudioRole,
  WorkoutCueCategory,
  WorkoutCueChannel,
  WorkoutCuePriority,
  WorkoutCueTiming,
  WorkoutStepType,
} from './workout-timeline.models';

export type WorkoutCueTemplateId = string;
export type WorkoutCueTemplateVariableName = string;

export type WorkoutCueTemplateSlot =
  | 'intro'
  | 'step-instruction'
  | 'transition'
  | 'encouragement'
  | 'correction'
  | 'boost'
  | 'completion';

export interface WorkoutCueTemplate {
  id: WorkoutCueTemplateId;
  enabled: boolean;
  slot: WorkoutCueTemplateSlot;
  workoutTypes: readonly WorkoutType[];
  coachingTones: readonly CoachingTone[];
  languages: readonly MindLiftLanguage[];
  stepTypes: readonly WorkoutStepType[];
  category: WorkoutCueCategory;
  channel: WorkoutCueChannel;
  timing: WorkoutCueTiming;
  priority: WorkoutCuePriority;
  text: string;
  variables: readonly WorkoutCueTemplateVariable[];
  audio?: WorkoutCueTemplateAudio;
}

export interface WorkoutCueTemplateVariable {
  name: WorkoutCueTemplateVariableName;
  required: boolean;
  fallbackText?: string;
}

export interface WorkoutCueTemplateAudio {
  role: WorkoutAudioRole;
  voiceKey?: string;
  sourceUrl?: string;
}
