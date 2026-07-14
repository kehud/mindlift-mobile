import {
  CoachingTone,
  WorkoutDuration,
  WorkoutType,
} from '../workout-setup/workout-setup-options';
import type { WorkoutTimeline } from '../workout-engine/models/workout-timeline.models';
import type { WorkoutCompletionReason } from '../workout-engine/models/workout-engine-runtime.models';

export type WorkoutSessionStatus = 'active' | 'completed';

export interface WorkoutSession {
  workoutType: WorkoutType;
  durationMinutes: WorkoutDuration;
  coachingTone: CoachingTone;
  mainGoal: string;
  timeline: WorkoutTimeline;
  startedAt: Date;
  actualDurationSeconds: number | null;
  completedAt: Date | null;
  completionReason: WorkoutCompletionReason | null;
  status: WorkoutSessionStatus;
}
