import type { WorkoutCueCategory } from './models/workout-timeline.models';

export type WorkoutCueIntervalLevel = 'low' | 'medium' | 'high';

export type WorkoutMainCueDurationMode =
  | 'none'
  | 'fixed-count'
  | 'max-count'
  | 'frequency-based';

export interface WorkoutMainCueDurationRule {
  minDurationMinutes: number;
  maxDurationMinutes: number | null;
  mode: WorkoutMainCueDurationMode;
  mainCueCount?: number;
  maxMainCueCount?: number;
}

export const WORKOUT_CUE_INTERVAL_SECONDS_BY_LEVEL = {
  low: 480,
  medium: 300,
  high: 180,
} as const satisfies Record<WorkoutCueIntervalLevel, number>;

export const WORKOUT_FIRST_MAIN_CUE_OFFSET_SECONDS = 120;
export const WORKOUT_CLOSING_LEAD_SECONDS = 60;
export const WORKOUT_MINIMUM_CUE_GAP_SECONDS = 90;
export const WORKOUT_MISSED_CUE_THRESHOLD_SECONDS = 60;
export const WORKOUT_BOOST_COOLDOWN_SECONDS = 30;

export const WORKOUT_MAIN_CUE_PATTERN = [
  'focus',
  'mental',
  'motivation',
  'focus',
  'reflection',
] as const satisfies readonly WorkoutCueCategory[];

export const WORKOUT_MAIN_CUE_DURATION_RULES = [
  {
    minDurationMinutes: 0,
    maxDurationMinutes: 5,
    mode: 'none',
    mainCueCount: 0,
  },
  {
    minDurationMinutes: 6,
    maxDurationMinutes: 10,
    mode: 'fixed-count',
    mainCueCount: 1,
  },
  {
    minDurationMinutes: 11,
    maxDurationMinutes: 20,
    mode: 'max-count',
    maxMainCueCount: 3,
  },
  {
    minDurationMinutes: 21,
    maxDurationMinutes: null,
    mode: 'frequency-based',
  },
] as const satisfies readonly WorkoutMainCueDurationRule[];
