import { effect, inject, Injectable } from '@angular/core';

import { LanguageDirectionService } from '../i18n/language-direction.service';
import { WorkoutAudioAdapter } from '../workout-engine/workout-audio.adapter';
import { WorkoutContentService } from '../workout-engine/workout-content.service';
import { WorkoutEngineService } from '../workout-engine/workout-engine.service';
import type { WorkoutTimeline } from '../workout-engine/models/workout-timeline.models';
import { generateWorkoutTimeline } from '../workout-engine/workout-timeline-generator';
import { WorkoutSetupStateService } from '../workout-setup/workout-setup-state.service';
import type { WorkoutSetup } from '../workout-setup/workout-setup.model';
import type { WorkoutSession } from './workout-session.model';

@Injectable({
  providedIn: 'root',
})
export class WorkoutSessionService {
  private readonly languageDirection = inject(LanguageDirectionService);
  private readonly workoutAudio = inject(WorkoutAudioAdapter);
  private readonly workoutContent = inject(WorkoutContentService);
  private readonly workoutEngine = inject(WorkoutEngineService);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);

  private currentSession: WorkoutSession | null = null;
  private handledCueEventCount = 0;

  private readonly presentedCueAudioEffect = effect(() => {
    const cueEvents = this.workoutEngine.cueEvents();
    const session = this.currentSession;

    if (!session) {
      return;
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

    this.workoutEngine.initialize(this.currentSession.timeline);
    this.workoutEngine.start();

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

    if (!engineSnapshot || engineSnapshot.status !== 'completed') {
      return this.getCurrentSession();
    }

    this.currentSession = {
      ...this.currentSession,
      actualDurationSeconds: engineSnapshot.elapsedSeconds,
      completedAt: engineSnapshot.completedAt,
      completionReason: engineSnapshot.completionReason,
      status: 'completed',
    };

    return this.getCurrentSession();
  }

  clearSession(): void {
    this.currentSession = null;
    this.workoutEngine.reset();
  }

  private generateTimelineFromSetup(setup: WorkoutSetup, startedAt: Date): WorkoutTimeline {
    return generateWorkoutTimeline({
      workoutType: setup.workoutType!,
      durationMinutes: setup.durationMinutes!,
      plannedDurationSeconds: setup.durationMinutes! * 60,
      coachingTone: setup.coachingTone!,
      language: this.languageDirection.getCurrentLanguage(),
      mainGoal: setup.mainGoal!,
      createdAt: startedAt,
    }, this.workoutContent.getCueTemplates());
  }
}
