import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { WorkoutHistoryService } from '../core/workout-history/workout-history.service';
import type { WorkoutHistoryEntry } from '../core/workout-history/workout-history.service';

@Component({
  selector: 'app-history-detail',
  templateUrl: './history-detail.page.html',
  styleUrls: ['./history-detail.page.scss'],
  standalone: false,
})
export class HistoryDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workoutHistory = inject(WorkoutHistoryService);

  workout: WorkoutHistoryEntry | null = null;
  isLoading = true;
  loadFailed = false;

  async ionViewWillEnter(): Promise<void> {
    const workoutId = this.route.snapshot.paramMap.get('workoutId');

    if (!workoutId) {
      await this.backToHistory();
      return;
    }

    this.isLoading = true;
    this.loadFailed = false;

    try {
      this.workout = await this.workoutHistory.loadCompletedWorkoutById(workoutId);
      this.loadFailed = this.workout === null;
    } catch {
      this.workout = null;
      this.loadFailed = true;
    } finally {
      this.isLoading = false;
    }
  }

  async backToHistory(): Promise<void> {
    await this.router.navigateByUrl('/history');
  }

  async done(): Promise<void> {
    await this.backToHistory();
  }

  formatWorkoutType(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  formatDuration(workout: WorkoutHistoryEntry): string {
    if (typeof workout.actualDurationSeconds === 'number' && Number.isFinite(workout.actualDurationSeconds)) {
      const totalSeconds = Math.max(0, Math.floor(workout.actualDurationSeconds));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${workout.durationMinutes}:00`;
  }

  formatDateRange(workout: WorkoutHistoryEntry): string {
    const completedAt = workout.completedAt;

    if (!completedAt) {
      return '';
    }

    const date = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(completedAt);
    const completedTime = this.formatTime(completedAt);

    if (workout.startedAt) {
      return `${date} · ${this.formatTime(workout.startedAt)} – ${completedTime}`;
    }

    return `${date} · ${completedTime}`;
  }

  formatCoachingTone(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  formatStatus(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  formatCompletionReason(value: WorkoutHistoryEntry['completionReason']): string {
    if (value === 'timeline_completed') {
      return 'Completed as planned';
    }

    if (value === 'ended_by_user') {
      return 'Ended by you';
    }

    return '';
  }

  workoutIcon(workoutType: WorkoutHistoryEntry['workoutType']): string {
    switch (workoutType) {
      case 'full-body':
      case 'push':
      case 'pull':
        return 'barbell-outline';
      case 'legs':
        return 'walk-outline';
      case 'upper-body':
        return 'body-outline';
      default:
        return 'body-outline';
    }
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}
