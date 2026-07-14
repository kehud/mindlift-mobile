import {
  CoachingTone,
  WorkoutDuration,
  WorkoutType,
} from '../workout-setup/workout-setup-options';
import type { WorkoutTimeline } from '../workout-engine/models/workout-timeline.models';

export type WorkoutSessionStatus = 'active' | 'completed';

export interface WorkoutSession {
  workoutType: WorkoutType;
  durationMinutes: WorkoutDuration;
  coachingTone: CoachingTone;
  mainGoal: string;
  timeline: WorkoutTimeline;
  startedAt: Date;
  status: WorkoutSessionStatus;
}
