import { CoachingTone, WorkoutDuration, WorkoutType } from './workout-setup-options';

export interface WorkoutSetup {
  workoutType: WorkoutType | null;
  durationMinutes: WorkoutDuration | null;
  coachingTone: CoachingTone | null;
  mainGoal: string | null;
}
