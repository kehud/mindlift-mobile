import { inject, Injectable, InjectionToken, OnDestroy } from '@angular/core';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

import type {
  WorkoutAudio,
  WorkoutCue,
} from './models/workout-timeline.models';
import { CoachingAudioSession } from './coaching-audio-session';

export const WORKOUT_AUDIO_ELEMENT_FACTORY = new InjectionToken<() => HTMLAudioElement>(
  'WORKOUT_AUDIO_ELEMENT_FACTORY',
  { providedIn: 'root', factory: () => () => new Audio() },
);

@Injectable({
  providedIn: 'root',
})
export class WorkoutAudioAdapter implements OnDestroy {
  private readonly createAudio = inject(WORKOUT_AUDIO_ELEMENT_FACTORY);
  private readonly useNativeAudio = Capacitor.getPlatform() === 'ios';
  private readonly presentedAudio = new Set<string>();
  private readonly nativeEndedListener: Promise<PluginListenerHandle | null> | null = null;
  private readonly nativeErrorListener: Promise<PluginListenerHandle | null> | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private activeNativeSourceUrl: string | null = null;
  private paused = false;
  private playAttempt = 0;

  constructor() {
    if (this.useNativeAudio) {
      this.nativeEndedListener = CoachingAudioSession.addListener('ended', (event) => {
        this.handleNativeCompletion(event.sourceUrl);
      }).catch((error: unknown) => {
        console.error('Failed to register native coaching audio ended listener.', error);
        return null;
      });
      this.nativeErrorListener = CoachingAudioSession.addListener('error', (event) => {
        console.error('Native coaching audio failed.', event.message ?? event);
        this.handleNativeCompletion(event.sourceUrl);
      }).catch((error: unknown) => {
        console.error('Failed to register native coaching audio error listener.', error);
        return null;
      });
    }
  }

  handlePresentedCue(cue: WorkoutCue, audio?: WorkoutAudio): void {
    if (!cue.audioId || !audio?.sourceUrl || cue.audioId !== audio.id) {
      return;
    }

    const presentationKey = JSON.stringify([cue.id, audio.id]);

    if (this.presentedAudio.has(presentationKey)) {
      return;
    }

    this.presentedAudio.add(presentationKey);
    this.stop();

    if (this.useNativeAudio) {
      this.activeNativeSourceUrl = audio.sourceUrl;

      if (!this.paused) {
        this.playNative(audio.sourceUrl);
      }

      return;
    }

    const element = this.createAudio();
    this.activeAudio = element;
    element.src = audio.sourceUrl;
    element.onended = element.onerror = () => {
      if (this.activeAudio === element) {
        this.stop();
      }
    };

    if (!this.paused) {
      this.play(element);
    }
  }

  pause(): void {
    if (this.paused) {
      return;
    }

    this.paused = true;
    // Ignore rejection of a pending play interrupted by this pause.
    this.playAttempt += 1;
    this.activeAudio?.pause();

    if (this.activeNativeSourceUrl) {
      void this.pauseNative();
    }
  }

  resume(): void {
    if (!this.paused) {
      return;
    }

    this.paused = false;

    if (this.activeNativeSourceUrl) {
      this.resumeNative();
      return;
    }

    if (this.activeAudio) {
      this.play(this.activeAudio);
    }
  }

  stop(): void {
    const element = this.activeAudio;
    this.activeAudio = null;
    const nativeSourceUrl = this.activeNativeSourceUrl;
    this.activeNativeSourceUrl = null;
    this.playAttempt += 1;

    if (element) {
      element.onended = null;
      element.onerror = null;
      element.pause();
      element.removeAttribute('src');
      element.load();
    }

    if (nativeSourceUrl) {
      void this.stopNative();
    }
  }

  reset(): void {
    this.stop();
    this.presentedAudio.clear();
    this.paused = false;
  }

  ngOnDestroy(): void {
    this.reset();
    void this.nativeEndedListener?.then((listener) => listener?.remove());
    void this.nativeErrorListener?.then((listener) => listener?.remove());
  }

  private play(element: HTMLAudioElement): void {
    const attempt = ++this.playAttempt;
    const handleFailure = () => {
      // An old rejection must not stop a replacement clip or a later resume.
      if (this.activeAudio === element && this.playAttempt === attempt) {
        this.stop();
      }
    };

    if (this.activeAudio !== element || this.playAttempt !== attempt || this.paused) {
      return;
    }

    try {
      void element.play().catch(handleFailure);
    } catch {
      handleFailure();
    }
  }

  private playNative(sourceUrl: string): void {
    const attempt = ++this.playAttempt;

    void CoachingAudioSession.play({ sourceUrl }).catch((error: unknown) => {
      console.error('Failed to start native coaching audio.', error);

      if (this.activeNativeSourceUrl === sourceUrl && this.playAttempt === attempt) {
        this.activeNativeSourceUrl = null;
      }
    });
  }

  private pauseNative(): void {
    void CoachingAudioSession.pause().catch((error: unknown) => {
      console.error('Failed to pause native coaching audio.', error);
    });
  }

  private resumeNative(): void {
    const sourceUrl = this.activeNativeSourceUrl;

    if (!sourceUrl) {
      return;
    }

    const attempt = ++this.playAttempt;

    void CoachingAudioSession.resume().catch((error: unknown) => {
      console.error('Failed to resume native coaching audio.', error);

      if (this.activeNativeSourceUrl === sourceUrl && this.playAttempt === attempt) {
        this.activeNativeSourceUrl = null;
      }
    });
  }

  private stopNative(): void {
    void CoachingAudioSession.stop().catch((error: unknown) => {
      console.error('Failed to stop native coaching audio.', error);
    });
  }

  private handleNativeCompletion(sourceUrl: string | undefined): void {
    if (sourceUrl && this.activeNativeSourceUrl !== sourceUrl) {
      return;
    }

    this.activeNativeSourceUrl = null;
    this.playAttempt += 1;
  }
}
