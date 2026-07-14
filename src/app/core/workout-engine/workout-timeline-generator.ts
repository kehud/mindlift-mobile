import type { MindLiftLanguage } from '../i18n/language-direction.service';
import { WORKOUT_TYPE_OPTIONS } from '../workout-setup/workout-setup-options';
import type {
  CoachingTone,
  WorkoutDuration,
  WorkoutType,
} from '../workout-setup/workout-setup-options';
import type {
  WorkoutCueTemplate,
  WorkoutCueTemplateSlot,
} from './models/workout-cue-template.models';
import type {
  WorkoutAudio,
  WorkoutCue,
  WorkoutCueCategory,
  WorkoutStep,
  WorkoutStepType,
  WorkoutTimeline,
  WorkoutTimelineId,
} from './models/workout-timeline.models';
import {
  WORKOUT_CLOSING_LEAD_SECONDS,
  WORKOUT_CUE_INTERVAL_SECONDS_BY_LEVEL,
  WORKOUT_FIRST_MAIN_CUE_OFFSET_SECONDS,
  WORKOUT_MAIN_CUE_DURATION_RULES,
  WORKOUT_MAIN_CUE_PATTERN,
  WORKOUT_MINIMUM_CUE_GAP_SECONDS,
} from './workout-timeline-generation.constants';
import type { WorkoutCueIntervalLevel } from './workout-timeline-generation.constants';
import { FALLBACK_CUE_TEMPLATES } from './workout-timeline-fallbacks';

export interface WorkoutTimelineGenerationInput {
  timelineId?: WorkoutTimelineId;
  workoutType: WorkoutType;
  durationMinutes: WorkoutDuration;
  plannedDurationSeconds: number;
  coachingTone: CoachingTone;
  language: MindLiftLanguage;
  mainGoal: string;
  title?: string;
  cueIntervalLevel?: WorkoutCueIntervalLevel;
  createdAt?: Date;
}

interface CuePlan {
  role: 'opening' | 'main' | 'closing';
  stepId: string;
  stepType: WorkoutStepType;
  slot: WorkoutCueTemplateSlot;
  category: WorkoutCueCategory;
  offsetSeconds: number;
  order: number;
}

interface GeneratedCue {
  cue: WorkoutCue;
  audio?: WorkoutAudio;
}

const WORKOUT_OPENING_DURATION_SECONDS = 60;
const DEFAULT_CUE_INTERVAL_LEVEL: WorkoutCueIntervalLevel = 'medium';
const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

export function generateWorkoutTimeline(
  input: Readonly<WorkoutTimelineGenerationInput>,
  templates: readonly WorkoutCueTemplate[],
): WorkoutTimeline {
  const plannedDurationSeconds = normalizeDurationSeconds(input.plannedDurationSeconds);
  const cueIntervalSeconds = WORKOUT_CUE_INTERVAL_SECONDS_BY_LEVEL[
    input.cueIntervalLevel ?? DEFAULT_CUE_INTERVAL_LEVEL
  ];
  const closingCueOffsetSeconds = getClosingCueOffsetSeconds(plannedDurationSeconds);
  const timelineId = input.timelineId ?? createStableId('timeline', [
    input.workoutType,
    input.durationMinutes,
    plannedDurationSeconds,
    input.coachingTone,
    input.language,
    input.mainGoal,
    input.title ?? '',
  ]);
  const title = input.title ?? `${getWorkoutTypeLabel(input.workoutType)} Workout`;
  const stepIds = {
    opening: createStableId('step', [timelineId, 'opening', 0]),
    workout: createStableId('step', [timelineId, 'workout', 1]),
    closing: createStableId('step', [timelineId, 'closing', 2]),
  };
  const templateUseCounts = new Map<string, number>();
  const openingCue = buildCue({
    role: 'opening',
    stepId: stepIds.opening,
    stepType: 'warmup',
    slot: 'intro',
    category: 'focus',
    offsetSeconds: 0,
    order: 0,
  }, input, timelineId, templates, templateUseCounts);
  const mainCues = getMainCueOffsets(plannedDurationSeconds, cueIntervalSeconds).map((offsetSeconds, index) => buildCue({
    role: 'main',
    stepId: stepIds.workout,
    stepType: 'work',
    slot: 'step-instruction',
    category: WORKOUT_MAIN_CUE_PATTERN[index % WORKOUT_MAIN_CUE_PATTERN.length],
    offsetSeconds,
    order: index + 1,
  }, input, timelineId, templates, templateUseCounts));
  const closingCue = buildCue({
    role: 'closing',
    stepId: stepIds.closing,
    stepType: 'cooldown',
    slot: 'completion',
    category: 'reflection',
    offsetSeconds: closingCueOffsetSeconds,
    order: mainCues.length + 1,
  }, input, timelineId, templates, templateUseCounts);
  const cueResults = [openingCue, ...mainCues, closingCue];
  const openingDurationSeconds = Math.min(
    WORKOUT_OPENING_DURATION_SECONDS,
    closingCueOffsetSeconds,
  );
  const workoutDurationSeconds = Math.max(closingCueOffsetSeconds - openingDurationSeconds, 0);
  const closingDurationSeconds = Math.max(plannedDurationSeconds - closingCueOffsetSeconds, 0);

  return {
    id: timelineId,
    version: 1,
    source: 'generated',
    workoutType: input.workoutType,
    durationMinutes: input.durationMinutes,
    coachingTone: input.coachingTone,
    language: input.language,
    title,
    mainGoal: input.mainGoal,
    totalDurationSeconds: plannedDurationSeconds,
    steps: [
      createStep(
        stepIds.opening,
        'warmup',
        'Opening',
        'Prepare for the workout.',
        0,
        openingDurationSeconds,
        [openingCue],
      ),
      createStep(
        stepIds.workout,
        'work',
        'Workout',
        `Work toward ${input.mainGoal}.`,
        openingDurationSeconds,
        workoutDurationSeconds,
        mainCues,
      ),
      createStep(
        stepIds.closing,
        'cooldown',
        'Closing',
        'Close the workout and reflect.',
        closingCueOffsetSeconds,
        closingDurationSeconds,
        [closingCue],
      ),
    ],
    cues: cueResults.map((result) => result.cue),
    audio: getCueAudio(cueResults),
    boosts: [],
    completion: {
      id: createStableId('completion', [timelineId, plannedDurationSeconds]),
      status: 'completed',
      title: 'Workout complete',
      summary: `Finished ${title} for ${input.mainGoal}.`,
      cueIds: [closingCue.cue.id],
      audioIds: getCueAudioIds([closingCue]),
    },
    createdAt: new Date(input.createdAt?.getTime() ?? 0),
  };
}

function createStep(
  id: string,
  type: WorkoutStepType,
  title: string,
  instructions: string,
  startOffsetSeconds: number,
  durationSeconds: number,
  cueResults: readonly GeneratedCue[],
): WorkoutStep {
  return {
    id,
    type,
    title,
    instructions,
    startOffsetSeconds,
    durationSeconds,
    cueIds: cueResults.map((result) => result.cue.id),
    audioIds: getCueAudioIds(cueResults),
    completion: {
      type: 'duration',
      targetSeconds: durationSeconds,
    },
  };
}

function buildCue(
  plan: CuePlan,
  input: Readonly<WorkoutTimelineGenerationInput>,
  timelineId: WorkoutTimelineId,
  templates: readonly WorkoutCueTemplate[],
  templateUseCounts: Map<string, number>,
): GeneratedCue {
  const template = selectTemplate(plan, input, timelineId, templates, templateUseCounts);
  const cueId = createStableId('cue', [
    timelineId,
    plan.role,
    plan.order,
    plan.category,
    plan.offsetSeconds,
    template.id,
  ]);
  const text = renderTemplateText(template, input, plan.category);
  const audio = template.audio?.sourceUrl
    ? {
      id: createStableId('audio', [timelineId, cueId, template.id]),
      role: template.audio.role,
      sourceUrl: template.audio.sourceUrl,
      transcript: text,
      cueId,
    }
    : undefined;

  return {
    cue: {
      id: cueId,
      stepId: plan.stepId,
      templateId: template.id,
      category: plan.category,
      channel: template.channel,
      timing: template.timing,
      priority: template.priority,
      text,
      offsetSeconds: plan.offsetSeconds,
      audioId: audio?.id,
    },
    audio,
  };
}

function selectTemplate(
  plan: CuePlan,
  input: Readonly<WorkoutTimelineGenerationInput>,
  timelineId: WorkoutTimelineId,
  templates: readonly WorkoutCueTemplate[],
  templateUseCounts: Map<string, number>,
): WorkoutCueTemplate {
  const matches = getMatchingTemplates(templates, plan, input);
  const pool = matches.length > 0
    ? matches
    : getMatchingTemplates(FALLBACK_CUE_TEMPLATES, plan, input);
  const selectionKey = getTemplateSelectionKey(plan, input);
  const useCount = templateUseCounts.get(selectionKey) ?? 0;
  const startIndex = stableNumber([timelineId, selectionKey].join('|')) % pool.length;
  const template = pool[(startIndex + useCount) % pool.length];

  templateUseCounts.set(selectionKey, useCount + 1);

  return template;
}

function getMatchingTemplates(
  templates: readonly WorkoutCueTemplate[],
  plan: CuePlan,
  input: Readonly<WorkoutTimelineGenerationInput>,
): readonly WorkoutCueTemplate[] {
  return templates
    .filter((template) => (
      template.enabled
      && template.slot === plan.slot
      && template.category === plan.category
      && template.workoutTypes.includes(input.workoutType)
      && template.coachingTones.includes(input.coachingTone)
      && template.languages.includes(input.language)
      && template.stepTypes.includes(plan.stepType)
    ))
    .slice()
    .sort((first, second) => first.id.localeCompare(second.id));
}

function getTemplateSelectionKey(
  plan: CuePlan,
  input: Readonly<WorkoutTimelineGenerationInput>,
): string {
  return [
    plan.slot,
    plan.stepType,
    plan.category,
    input.workoutType,
    input.coachingTone,
    input.language,
  ].join('|');
}

function getMainCueOffsets(
  plannedDurationSeconds: number,
  cueIntervalSeconds: number,
): readonly number[] {
  const cueLimit = getMainCueLimit(plannedDurationSeconds);

  if (cueLimit === 0) {
    return [];
  }

  const intervalSeconds = Math.max(cueIntervalSeconds, WORKOUT_MINIMUM_CUE_GAP_SECONDS);
  const latestOffsetSeconds = getClosingCueOffsetSeconds(plannedDurationSeconds)
    - WORKOUT_MINIMUM_CUE_GAP_SECONDS;
  const offsets: number[] = [];

  for (
    let offsetSeconds = WORKOUT_FIRST_MAIN_CUE_OFFSET_SECONDS;
    offsetSeconds <= latestOffsetSeconds;
    offsetSeconds += intervalSeconds
  ) {
    offsets.push(offsetSeconds);
  }

  return cueLimit === null ? offsets : offsets.slice(0, cueLimit);
}

function getMainCueLimit(plannedDurationSeconds: number): number | null {
  const durationMinutes = Math.ceil(plannedDurationSeconds / 60);
  const rule = WORKOUT_MAIN_CUE_DURATION_RULES.find((durationRule) => (
    durationMinutes >= durationRule.minDurationMinutes
    && (durationRule.maxDurationMinutes === null || durationMinutes <= durationRule.maxDurationMinutes)
  ));

  if (!rule || rule.mode === 'none') {
    return 0;
  }

  if (rule.mode === 'fixed-count') {
    return rule.mainCueCount;
  }

  if (rule.mode === 'max-count') {
    return rule.maxMainCueCount;
  }

  return null;
}

function getClosingCueOffsetSeconds(plannedDurationSeconds: number): number {
  return Math.min(
    Math.max(plannedDurationSeconds - WORKOUT_CLOSING_LEAD_SECONDS, 0),
    plannedDurationSeconds,
  );
}

function renderTemplateText(
  template: WorkoutCueTemplate,
  input: Readonly<WorkoutTimelineGenerationInput>,
  category: WorkoutCueCategory,
): string {
  const values: Record<string, string> = {
    category,
    coachingTone: input.coachingTone,
    durationMinutes: String(input.durationMinutes),
    language: input.language,
    mainGoal: input.mainGoal,
    plannedDurationSeconds: String(normalizeDurationSeconds(input.plannedDurationSeconds)),
    workoutType: input.workoutType,
  };

  return template.text.replace(TEMPLATE_VARIABLE_PATTERN, (_match, variableName: string) => {
    const templateVariable = template.variables.find((variable) => variable.name === variableName);

    return values[variableName] ?? templateVariable?.fallbackText ?? '';
  });
}

function getWorkoutTypeLabel(workoutType: WorkoutType): string {
  return WORKOUT_TYPE_OPTIONS.find((option) => option.value === workoutType)?.label ?? workoutType;
}

function getCueAudio(cueResults: readonly GeneratedCue[]): readonly WorkoutAudio[] {
  return cueResults
    .map((result) => result.audio)
    .filter((audio): audio is WorkoutAudio => audio !== undefined);
}

function getCueAudioIds(cueResults: readonly GeneratedCue[]): readonly string[] {
  return getCueAudio(cueResults).map((audio) => audio.id);
}

function normalizeDurationSeconds(durationSeconds: number): number {
  return Math.max(0, Math.floor(durationSeconds));
}

function createStableId(prefix: string, parts: readonly unknown[]): string {
  return `${prefix}-${stableNumber(parts.join('|')).toString(36)}`;
}

function stableNumber(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
