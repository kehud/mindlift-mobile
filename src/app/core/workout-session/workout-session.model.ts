import {
  CoachingTone,
  WorkoutDuration,
  WorkoutType,
} from '../workout-setup/workout-setup-options';

export type WorkoutSessionStatus = 'active' | 'completed';

export interface WorkoutSession {
  workoutType: WorkoutType;
  durationMinutes: WorkoutDuration;
  coachingTone: CoachingTone;
  mainGoal: string;
  startedAt: Date;
  status: WorkoutSessionStatus;
}
