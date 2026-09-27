import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

interface CoachingAudioSessionEvent {
  message?: string;
  sourceUrl?: string;
  success?: boolean;
}

interface CoachingAudioSessionPlugin {
  play(options: { sourceUrl: string }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'ended' | 'error',
    listenerFunc: (event: CoachingAudioSessionEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const CoachingAudioSession = registerPlugin<CoachingAudioSessionPlugin>('CoachingAudioSession');
