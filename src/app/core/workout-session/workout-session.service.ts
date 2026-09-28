import { effect, inject, Injectable, OnDestroy } from '@angular/core';

import type { MindLiftLanguage } from '../i18n/language-direction.service';
import type { WorkoutEngineRuntimeSnapshot } from '../workout-engine/models/workout-engine-runtime.models';
import { WorkoutAudioAdapter } from '../workout-engine/workout-audio.adapter';
import { WorkoutContentService } from '../workout-engine/workout-content.service';
import { WorkoutEngineService } from '../workout-engine/workout-engine.service';
import type { WorkoutTimeline } from '../workout-engine/models/workout-timeline.models';
import { generateWorkoutTimeline } from '../workout-engine/workout-timeline-generator';
import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import type { WorkoutSetup } from '../workout-setup/workout-setup.model';
import { WorkoutHapticsService } from './workout-haptics.service';
import type { WorkoutSession } from './workout-session.model';

// MVP workout content is Hebrew independently of the application UI language.
const MVP_WORKOUT_CONTENT_LANGUAGE: MindLiftLanguage = 'he';

@Injectable({
  providedIn: 'root',
})
export class WorkoutSessionService implements OnDestroy {
  private readonly workoutAudio = inject(WorkoutAudioAdapter);
  private readonly workoutContent = inject(WorkoutContentService);
  private readonly workoutEngine = inject(WorkoutEngineService);
  private readonly workoutHaptics = inject(WorkoutHapticsService);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);

  private currentSession: WorkoutSession | null = null;
  private handledCueEventCount = 0;

  private readonly presentedCueAudioEffect = effect(() => {
    const cueEvents = this.workoutEngine.cueEvents();
    const status = this.workoutEngine.snapshot()?.status;
    const session = this.currentSession;

    if (!session || !status || status === 'idle') {
      this.workoutAudio.stop();
      this.handledCueEventCount = cueEvents.length;
      return;
    }

    if (status === 'completed') {
      this.applyCompletedEngineSnapshot(this.workoutEngine.getSnapshot());
      this.workoutAudio.stop();
      this.handledCueEventCount = cueEvents.length;
      return;
    }

    if (status === 'paused') {
      this.workoutAudio.pause();
    } else {
      this.workoutAudio.resume();
    }

    for (const event of cueEvents.slice(this.handledCueEventCount)) {
      if (event.type !== 'cue-presented') {
        continue;
      }

      const cue = session.timeline.cues.find((candidate) => candidate.id === event.cueId);

      if (!cue) {
        continue;
      }

      const audio = cue.audioId
        ? session.timeline.audio.find((candidate) => candidate.id === cue.audioId)
        : undefined;

      this.workoutAudio.handlePresentedCue(cue, audio);
    }

    this.handledCueEventCount = cueEvents.length;
  });

  getCurrentSession(): WorkoutSession | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      ...this.currentSession,
      startedAt: new Date(this.currentSession.startedAt),
      completedAt: this.currentSession.completedAt
        ? new Date(this.currentSession.completedAt)
        : null,
    };
  }

  async initializeFromSetup(): Promise<WorkoutSession | null> {
    if (this.currentSession?.status === 'active') {
      return this.getCurrentSession();
    }

    await this.workoutSetupState.prefillFromOnboardingProfile();

    if (!this.workoutSetupState.isCompleteSetup()) {
      this.currentSession = null;
      return null;
    }

    const setup = this.workoutSetupState.getSnapshot();
    const startedAt = new Date();

    this.currentSession = {
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      coachingTone: setup.coachingTone!,
      mainGoal: setup.mainGoal!,
      timeline: this.generateTimelineFromSetup(setup, startedAt),
      startedAt,
      actualDurationSeconds: null,
      completedAt: null,
      completionReason: null,
      status: 'active',
    };

    this.workoutAudio.reset();
    this.handledCueEventCount = 0;
    this.workoutEngine.initialize(this.currentSession.timeline);
    this.workoutEngine.start();
    void this.workoutHaptics.workoutStarted();

    return this.getCurrentSession();
  }

  completeCurrentSession(): WorkoutSession | null {
    if (!this.currentSession) {
      return null;
    }

    let engineSnapshot = this.workoutEngine.getSnapshot();

    if (engineSnapshot?.status !== 'completed') {
      this.workoutEngine.complete('ended_by_user');
      engineSnapshot = this.workoutEngine.getSnapshot();
    }

    if (!this.applyCompletedEngineSnapshot(engineSnapshot)) {
      return this.getCurrentSession();
    }

    return this.getCurrentSession();
  }

  clearSession(): void {
    this.workoutAudio.reset();
    this.handledCueEventCount = 0;
    this.currentSession = null;
    this.workoutEngine.reset();
  }

  ngOnDestroy(): void {
    this.presentedCueAudioEffect.destroy();
    this.workoutAudio.reset();
  }

  private applyCompletedEngineSnapshot(engineSnapshot: WorkoutEngineRuntimeSnapshot | null): boolean {
    if (!this.currentSession || !engineSnapshot || engineSnapshot.status !== 'completed') {
      return false;
    }

    const wasCompleted = this.currentSession.status === 'completed';
    this.workoutAudio.stop();
    this.currentSession = {
      ...this.currentSession,
      actualDurationSeconds: engineSnapshot.elapsedSeconds,
      completedAt: engineSnapshot.completedAt,
      completionReason: engineSnapshot.completionReason,
      status: 'completed',
    };

    if (!wasCompleted) {
      void this.workoutHaptics.workoutCompleted();
    }

    return true;
  }

  private generateTimelineFromSetup(setup: WorkoutSetup, startedAt: Date): WorkoutTimeline {
    return generateWorkoutTimeline({
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      plannedDurationSeconds: setup.durationMinutes! * 60,
      coachingTone: setup.coachingTone!,
      language: MVP_WORKOUT_CONTENT_LANGUAGE,
      mainGoal: setup.mainGoal!,
      createdAt: startedAt,
    }, this.workoutContent.getCueTemplates());
  }
}
