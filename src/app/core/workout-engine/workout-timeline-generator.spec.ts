import type { WorkoutCueTemplate } from './models/workout-cue-template.models';
import type {
  WorkoutCue,
  WorkoutCueCategory,
  WorkoutTimeline,
} from './models/workout-timeline.models';
import {
  WORKOUT_CUE_INTERVAL_SECONDS_BY_LEVEL,
  WORKOUT_FIRST_MAIN_CUE_OFFSET_SECONDS,
  WORKOUT_MAIN_CUE_PATTERN,
  WORKOUT_MINIMUM_CUE_GAP_SECONDS,
} from './workout-timeline-generation.constants';
import {
  generateWorkoutTimeline,
} from './workout-timeline-generator';
import type { WorkoutTimelineGenerationInput } from './workout-timeline-generator';

describe('generateWorkoutTimeline', () => {
  it('places the opening cue at 0', () => {
    const timeline = generateWorkoutTimeline(createInput(), createTemplates());

    expect(getOpeningCue(timeline).offsetSeconds).toBe(0);
  });

  it('clamps the closing cue safely for short workouts', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ plannedDurationSeconds: 30 }),
      createTemplates(),
    );

    expect(getClosingCue(timeline).offsetSeconds).toBe(0);
  });

  it('produces no main cues for workouts up to 5 minutes', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ plannedDurationSeconds: 5 * 60 }),
      createTemplates(),
    );

    expect(getMainCues(timeline)).toEqual([]);
  });

  it('produces exactly 1 main cue for 6-10 minute workouts', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ plannedDurationSeconds: 10 * 60 }),
      createTemplates(),
    );

    expect(getMainCues(timeline).length).toBe(1);
  });

  it('produces no more than 3 main cues for 11-20 minute workouts', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ durationMinutes: 20, plannedDurationSeconds: 20 * 60 }),
      createTemplates(),
    );
    const mainCues = getMainCues(timeline);

    expect(mainCues.length).toBe(3);
    expect(mainCues.length).toBeLessThanOrEqual(3);
  });

  it('uses frequency-based spacing above 20 minutes', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ durationMinutes: 30, plannedDurationSeconds: 30 * 60 }),
      createTemplates(),
    );
    const mainCueOffsets = getMainCues(timeline).map((cue) => cue.offsetSeconds);

    expect(mainCueOffsets.length).toBeGreaterThan(3);

    for (let index = 1; index < mainCueOffsets.length; index += 1) {
      expect(mainCueOffsets[index] - mainCueOffsets[index - 1])
        .toBe(WORKOUT_CUE_INTERVAL_SECONDS_BY_LEVEL.medium);
    }
  });

  it('does not start main cues before the first-main-cue offset', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ durationMinutes: 30, plannedDurationSeconds: 30 * 60 }),
      createTemplates(),
    );

    expect(getMainCues(timeline).every(
      (cue) => cue.offsetSeconds >= WORKOUT_FIRST_MAIN_CUE_OFFSET_SECONDS,
    )).toBeTrue();
  });

  it('respects the minimum cue gap', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ durationMinutes: 30, plannedDurationSeconds: 30 * 60 }),
      createTemplates(),
    );
    const cueOffsets = timeline.cues.map((cue) => cue.offsetSeconds);

    for (let index = 1; index < cueOffsets.length; index += 1) {
      expect(cueOffsets[index] - cueOffsets[index - 1])
        .toBeGreaterThanOrEqual(WORKOUT_MINIMUM_CUE_GAP_SECONDS);
    }
  });

  it('follows the approved main cue category pattern', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ durationMinutes: 30, plannedDurationSeconds: 30 * 60 }),
      createTemplates(),
    );
    const categories = getMainCues(timeline).map((cue) => cue.category);
    const expectedCategories = categories.map((_, index) => (
      WORKOUT_MAIN_CUE_PATTERN[index % WORKOUT_MAIN_CUE_PATTERN.length]
    ));

    expect(categories).toEqual(expectedCategories);
  });

  it('ignores disabled templates', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ plannedDurationSeconds: 10 * 60 }),
      [
        createOpeningTemplate(),
        createMainTemplate('focus', 'disabled-main-focus', { enabled: false }),
        createClosingTemplate(),
      ],
    );

    expect(getMainCues(timeline)[0].templateId).toBe('fallback-main-focus');
  });

  it('filters templates by workout type and coaching tone', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ plannedDurationSeconds: 10 * 60 }),
      [
        createOpeningTemplate(),
        createMainTemplate('focus', 'wrong-workout-type', { workoutTypes: ['cardio'] }),
        createMainTemplate('focus', 'wrong-coaching-tone', { coachingTones: ['direct'] }),
        createMainTemplate('focus', 'matching-focus-template'),
        createClosingTemplate(),
      ],
    );

    expect(getMainCues(timeline)[0].templateId).toBe('matching-focus-template');
  });

  it('uses fallback templates when no caller template matches', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ plannedDurationSeconds: 10 * 60 }),
      [],
    );

    expect(timeline.cues.every((cue) => cue.templateId?.startsWith('fallback-'))).toBeTrue();
  });

  it('produces the same timeline for the same input and templates', () => {
    const input = createInput({ durationMinutes: 30, plannedDurationSeconds: 30 * 60 });
    const templates = createTemplates();

    expect(generateWorkoutTimeline(input, templates))
      .toEqual(generateWorkoutTimeline(input, templates));
  });

  it('does not mutate input or templates', () => {
    const input = createInput({ durationMinutes: 30, plannedDurationSeconds: 30 * 60 });
    const templates = createTemplates();
    const inputBefore = JSON.stringify(input);
    const templatesBefore = JSON.stringify(templates);

    generateWorkoutTimeline(input, templates);

    expect(JSON.stringify(input)).toBe(inputBefore);
    expect(JSON.stringify(templates)).toBe(templatesBefore);
  });

  it('reuses templates only after the matching pool is exhausted', () => {
    const timeline = generateWorkoutTimeline(
      createInput({ timelineId: 'template-reuse', durationMinutes: 30, plannedDurationSeconds: 30 * 60 }),
      [
        createOpeningTemplate(),
        createMainTemplate('focus', 'main-focus-a'),
        createMainTemplate('focus', 'main-focus-b'),
        createMainTemplate('mental'),
        createMainTemplate('motivation'),
        createMainTemplate('reflection'),
        createClosingTemplate(),
      ],
    );
    const focusTemplateIds = getMainCues(timeline)
      .filter((cue) => cue.category === 'focus')
      .map((cue) => cue.templateId);

    expect(focusTemplateIds.length).toBeGreaterThanOrEqual(3);
    expect(focusTemplateIds[0]).not.toBe(focusTemplateIds[1]);
    expect(focusTemplateIds[2]).toBe(focusTemplateIds[0]);
  });
});

function createInput(
  overrides: Partial<WorkoutTimelineGenerationInput> = {},
): WorkoutTimelineGenerationInput {
  return {
    timelineId: 'test-timeline',
    workoutType: 'strength',
    durationMinutes: 10,
    plannedDurationSeconds: 10 * 60,
    coachingTone: 'supportive',
    language: 'en',
    mainGoal: 'stay focused',
    title: 'Test Workout',
    cueIntervalLevel: 'medium',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function createTemplates(): readonly WorkoutCueTemplate[] {
  return [
    createOpeningTemplate(),
    createMainTemplate('focus'),
    createMainTemplate('mental'),
    createMainTemplate('motivation'),
    createMainTemplate('reflection'),
    createClosingTemplate(),
  ];
}

function createOpeningTemplate(): WorkoutCueTemplate {
  return createTemplate({
    id: 'opening-template',
    slot: 'intro',
    stepTypes: ['warmup'],
    category: 'focus',
    timing: 'before-step',
    priority: 'high',
  });
}

function createClosingTemplate(): WorkoutCueTemplate {
  return createTemplate({
    id: 'closing-template',
    slot: 'completion',
    stepTypes: ['cooldown'],
    category: 'reflection',
    timing: 'before-step',
    priority: 'high',
  });
}

function createMainTemplate(
  category: WorkoutCueCategory,
  id = `main-${category}-template`,
  overrides: Partial<WorkoutCueTemplate> = {},
): WorkoutCueTemplate {
  return createTemplate({
    id,
    slot: 'step-instruction',
    stepTypes: ['work'],
    category,
    ...overrides,
  });
}

function createTemplate(
  overrides: Partial<WorkoutCueTemplate> & Pick<
    WorkoutCueTemplate,
    'category' | 'id' | 'slot' | 'stepTypes'
  >,
): WorkoutCueTemplate {
  return {
    enabled: true,
    workoutTypes: ['strength'],
    coachingTones: ['supportive'],
    languages: ['en'],
    channel: 'visual',
    timing: 'during-step',
    priority: 'normal',
    text: `Cue from ${overrides.id}`,
    variables: [],
    ...overrides,
  };
}

function getOpeningCue(timeline: WorkoutTimeline): WorkoutCue {
  return getCueById(timeline, timeline.steps[0].cueIds[0]);
}

function getMainCues(timeline: WorkoutTimeline): readonly WorkoutCue[] {
  return timeline.steps[1].cueIds.map((cueId) => getCueById(timeline, cueId));
}

function getClosingCue(timeline: WorkoutTimeline): WorkoutCue {
  return getCueById(timeline, timeline.steps[2].cueIds[0]);
}

function getCueById(timeline: WorkoutTimeline, cueId: string): WorkoutCue {
  const cue = timeline.cues.find((candidate) => candidate.id === cueId);

  expect(cue).toBeDefined();

  return cue as WorkoutCue;
}
