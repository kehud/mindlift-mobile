import type { MindLiftLanguage } from '../i18n/language-direction.service';
import {
  COACHING_TONE_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from '../workout-setup/workout-setup-options';
import type {
  WorkoutCueTemplate,
  WorkoutCueTemplateSlot,
  WorkoutCueTemplateVariable,
} from './models/workout-cue-template.models';
import type {
  WorkoutCueCategory,
  WorkoutCuePriority,
  WorkoutCueTiming,
  WorkoutStepType,
} from './models/workout-timeline.models';

interface FallbackCueTemplateConfig {
  id: string;
  slot: WorkoutCueTemplateSlot;
  stepType: WorkoutStepType;
  category: WorkoutCueCategory;
  timing: WorkoutCueTiming;
  priority: WorkoutCuePriority;
  text: string;
  variables?: readonly WorkoutCueTemplateVariable[];
}

const FALLBACK_TEMPLATE_LANGUAGES = ['en', 'he'] as const satisfies readonly MindLiftLanguage[];
const ALL_WORKOUT_TYPES = WORKOUT_TYPE_OPTIONS.map((option) => option.value);
const ALL_COACHING_TONES = COACHING_TONE_OPTIONS.map((option) => option.value);

export const FALLBACK_CUE_TEMPLATES = [
  createFallbackTemplate({
    id: 'fallback-intro-focus',
    slot: 'intro',
    stepType: 'warmup',
    category: 'focus',
    timing: 'before-step',
    priority: 'high',
    text: 'Begin with your goal in mind: {{mainGoal}}.',
    variables: [{ name: 'mainGoal', required: true, fallbackText: 'today' }],
  }),
  createFallbackTemplate({
    id: 'fallback-main-focus',
    slot: 'step-instruction',
    stepType: 'work',
    category: 'focus',
    timing: 'during-step',
    priority: 'normal',
    text: 'Return your attention to the next clean rep.',
  }),
  createFallbackTemplate({
    id: 'fallback-main-mental',
    slot: 'step-instruction',
    stepType: 'work',
    category: 'mental',
    timing: 'during-step',
    priority: 'normal',
    text: 'Notice the effort, steady your breath, and keep going.',
  }),
  createFallbackTemplate({
    id: 'fallback-main-motivation',
    slot: 'step-instruction',
    stepType: 'work',
    category: 'motivation',
    timing: 'during-step',
    priority: 'normal',
    text: 'You are building momentum. Stay with it.',
  }),
  createFallbackTemplate({
    id: 'fallback-main-reflection',
    slot: 'step-instruction',
    stepType: 'work',
    category: 'reflection',
    timing: 'during-step',
    priority: 'normal',
    text: 'Check in with your body and adjust with care.',
  }),
  createFallbackTemplate({
    id: 'fallback-completion-reflection',
    slot: 'completion',
    stepType: 'cooldown',
    category: 'reflection',
    timing: 'before-step',
    priority: 'high',
    text: 'Close strong. Notice one thing you did well.',
  }),
] as const satisfies readonly WorkoutCueTemplate[];

function createFallbackTemplate(config: FallbackCueTemplateConfig): WorkoutCueTemplate {
  return {
    id: config.id,
    enabled: true,
    slot: config.slot,
    workoutTypes: ALL_WORKOUT_TYPES,
    coachingTones: ALL_COACHING_TONES,
    languages: FALLBACK_TEMPLATE_LANGUAGES,
    stepTypes: [config.stepType],
    category: config.category,
    channel: 'visual',
    timing: config.timing,
    priority: config.priority,
    text: config.text,
    variables: config.variables ?? [],
  };
}
