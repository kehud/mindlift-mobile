import { Injectable } from '@angular/core';

import type {
  WorkoutAudio,
  WorkoutCue,
} from './models/workout-timeline.models';

@Injectable({
  providedIn: 'root',
})
export class WorkoutAudioAdapter {
  handlePresentedCue(cue: WorkoutCue, audio?: WorkoutAudio): void {
    if (!cue.audioId || !audio?.sourceUrl) {
      return;
    }

    // Platform-specific audio playback will be added here.
  }
}
