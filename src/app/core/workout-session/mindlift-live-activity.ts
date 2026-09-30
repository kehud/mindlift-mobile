import { registerPlugin } from '@capacitor/core';

export type MindLiftLiveActivityStatus = 'active' | 'completed';

export interface MindLiftLiveActivityState {
  workoutStage?: string;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  progress?: number;
  timerStartedAt?: string;
  timerEndsAt?: string;
  isTimerRunning?: boolean;
  status?: MindLiftLiveActivityStatus;
}

export interface MindLiftLiveActivityStartOptions extends MindLiftLiveActivityState {
  workoutTitle: string;
}

export interface MindLiftLiveActivityUpdateOptions extends MindLiftLiveActivityState {
  activityId?: string;
}

export interface MindLiftLiveActivityEndOptions extends MindLiftLiveActivityState {
  activityId?: string;
}

export interface MindLiftLiveActivityStartResult {
  activityId: string;
}

export interface MindLiftLiveActivityUpdateResult {
  activityId: string;
}

export interface MindLiftLiveActivityEndResult {
  activityId?: string;
  ended: boolean;
}

interface MindLiftLiveActivityPlugin {
  start(options: MindLiftLiveActivityStartOptions): Promise<MindLiftLiveActivityStartResult>;
  update(options: MindLiftLiveActivityUpdateOptions): Promise<MindLiftLiveActivityUpdateResult>;
  end(options?: MindLiftLiveActivityEndOptions): Promise<MindLiftLiveActivityEndResult>;
}

export const MindLiftLiveActivity = registerPlugin<MindLiftLiveActivityPlugin>('MindLiftLiveActivity');
