export interface WorkoutSetupOption<TValue extends number | string> {
  value: TValue;
  label: string;
}

export const WORKOUT_TYPE_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'yoga', label: 'Yoga' },
] as const satisfies readonly WorkoutSetupOption<string>[];

export const COACHING_TONE_OPTIONS = [
  { value: 'supportive', label: 'Supportive' },
  { value: 'direct', label: 'Direct' },
  { value: 'calm', label: 'Calm' },
  { value: 'high-energy', label: 'High energy' },
] as const satisfies readonly WorkoutSetupOption<string>[];

export const WORKOUT_DURATION_OPTIONS = [
  { value: 10, label: '10 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
] as const satisfies readonly WorkoutSetupOption<number>[];

export type WorkoutType = typeof WORKOUT_TYPE_OPTIONS[number]['value'];
export type CoachingTone = typeof COACHING_TONE_OPTIONS[number]['value'];
export type WorkoutDuration = typeof WORKOUT_DURATION_OPTIONS[number]['value'];

export function isWorkoutType(value: string | null): value is WorkoutType {
  return value !== null && WORKOUT_TYPE_OPTIONS.some((option) => option.value === value);
}

export function isCoachingTone(value: string | null): value is CoachingTone {
  return value !== null && COACHING_TONE_OPTIONS.some((option) => option.value === value);
}

export function isWorkoutDuration(value: number | null): value is WorkoutDuration {
  return value !== null && WORKOUT_DURATION_OPTIONS.some((option) => option.value === value);
}
