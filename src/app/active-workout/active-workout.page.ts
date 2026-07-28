import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { WorkoutEngineRuntimeSnapshot } from '../core/workout-engine/models/workout-engine-runtime.models';
import type { WorkoutStep } from '../core/workout-engine/models/workout-timeline.models';
import { WorkoutEngineService } from '../core/workout-engine/workout-engine.service';
import { WorkoutSession } from '../core/workout-session/workout-session.model';
import { WorkoutSessionService } from '../core/workout-session/workout-session.service';

interface ActiveCueContent {
  title: string;
  text: string;
}

@Component({
  selector: 'app-active-workout',
  templateUrl: 'active-workout.page.html',
  styleUrls: ['active-workout.page.scss'],
  standalone: false,
})
export class ActiveWorkoutPage {
  private readonly router = inject(Router);
  private readonly workoutEngine = inject(WorkoutEngineService);
  private readonly workoutSessionService = inject(WorkoutSessionService);

  private navigatingToSummary = false;
  private readonly sessionState = signal<WorkoutSession | null>(null);

  readonly session = this.sessionState.asReadonly();
  readonly snapshot = this.workoutEngine.snapshot;
  readonly isLoading = signal(true);
  readonly hasSession = computed(() => this.session() !== null);
  readonly isPaused = computed(() => this.snapshot()?.status === 'paused');
  readonly isCompleted = computed(() => this.snapshot()?.status === 'completed');
  readonly progress = computed(() => {
    const session = this.session();
    const snapshot = this.snapshot();
    const totalSeconds = session?.timeline.totalDurationSeconds ?? 0;

    if (!snapshot || totalSeconds <= 0) {
      return 0;
    }

    return Math.min(Math.max(snapshot.elapsedSeconds / totalSeconds, 0), 1);
  });
  readonly progressPercent = computed(() => Math.round(this.progress() * 100));
  readonly remainingTime = computed(() => this.formatDuration(this.snapshot()?.remainingSeconds ?? 0));
  readonly elapsedTime = computed(() => this.formatDuration(this.snapshot()?.elapsedSeconds ?? 0));
  readonly activeStep = computed(() => this.getActiveStep(this.session(), this.snapshot()));
  readonly cueContent = computed<ActiveCueContent>(() => {
    const snapshot = this.snapshot();
    const step = this.activeStep();
    const cue = snapshot?.currentCue;

    if (snapshot?.status === 'paused') {
      return {
        title: step?.title ?? 'Workout paused',
        text: 'Take a breath. Resume when you are ready.',
      };
    }

    if (cue) {
      return {
        title: step?.title ?? 'MindLift cue',
        text: cue.text,
      };
    }

    return {
      title: step?.title ?? 'Getting started',
      text: step?.instructions ?? 'Your next cue will appear here.',
    };
  });

  private readonly automaticCompletionEffect = effect(() => {
    const snapshot = this.snapshot();

    if (
      snapshot?.status === 'completed'
      && snapshot.completionReason === 'timeline_completed'
    ) {
      void this.finishWorkout();
    }
  });

  async ionViewWillEnter(): Promise<void> {
    this.navigatingToSummary = false;
    this.isLoading.set(true);

    const session = await this.workoutSessionService.initializeFromSetup();

    this.sessionState.set(session);
    this.isLoading.set(false);

    if (!session) {
      await this.router.navigateByUrl('/workout-setup', { replaceUrl: true });
    }
  }

  togglePause(): void {
    if (this.isPaused()) {
      this.workoutEngine.resume();
      return;
    }

    this.workoutEngine.pause();
  }

  async finishWorkout(): Promise<void> {
    this.sessionState.set(this.workoutSessionService.completeCurrentSession());

    await this.navigateToSummary();
  }

  private getActiveStep(
    session: WorkoutSession | null,
    snapshot: WorkoutEngineRuntimeSnapshot | null,
  ): WorkoutStep | null {
    if (!session || !snapshot?.activeStepId) {
      return null;
    }

    return session.timeline.steps.find((step) => step.id === snapshot.activeStepId) ?? null;
  }

  private formatDuration(value: number): string {
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private async navigateToSummary(): Promise<void> {
    if (this.navigatingToSummary) {
      return;
    }

    this.navigatingToSummary = true;

    await this.router.navigateByUrl('/summary');
  }
}
