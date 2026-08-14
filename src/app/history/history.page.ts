import { Component, inject } from '@angular/core';

import {
  WorkoutHistoryService,
} from '../core/workout-history/workout-history.service';
import type { WorkoutHistoryEntry } from '../core/workout-history/workout-history.service';

interface WorkoutDateGroup {
  key: string;
  label: string;
  workouts: WorkoutHistoryEntry[];
}

interface MonthlyProgress {
  workouts: number;
  actualMinutes: number;
  dayStreak: number;
}

@Component({
  selector: 'app-history',
  templateUrl: 'history.page.html',
  styleUrls: ['history.page.scss'],
  standalone: false,
})
export class HistoryPage {
  private readonly workoutHistory = inject(WorkoutHistoryService);

  workouts: WorkoutHistoryEntry[] = [];
  isLoading = true;
  isCalendarOpen = false;
  selectedMonth: Date | null = null;
  selectedDateKey: string | null = null;

  async ionViewWillEnter(): Promise<void> {
    this.isLoading = true;

    try {
      this.workouts = await this.workoutHistory.loadCompletedWorkouts();
      this.selectedMonth = this.getInitialMonth();
    } finally {
      this.isLoading = false;
    }
  }

  get monthLabel(): string {
    if (!this.selectedMonth) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(this.selectedMonth);
  }

  get monthlyProgress(): MonthlyProgress {
    const month = this.selectedMonth;

    if (!month) {
      return { workouts: 0, actualMinutes: 0, dayStreak: 0 };
    }

    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).getTime();
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
    const monthlyWorkouts = this.workouts.filter((workout) => {
      const completedAt = workout.completedAt?.getTime();

      return completedAt !== undefined && completedAt >= monthStart && completedAt < monthEnd;
    });
    const actualSeconds = monthlyWorkouts.reduce((total, workout) =>
      total + (typeof workout.actualDurationSeconds === 'number'
        ? Math.max(0, workout.actualDurationSeconds)
        : 0), 0);

    return {
      workouts: monthlyWorkouts.length,
      actualMinutes: Math.floor(actualSeconds / 60),
      dayStreak: this.calculateCurrentDayStreak(),
    };
  }

  get workoutGroups(): WorkoutDateGroup[] {
    const groups = new Map<string, WorkoutDateGroup>();

    for (const workout of this.workouts) {
      if (!workout.completedAt) {
        continue;
      }

      const key = this.toDateKey(workout.completedAt);
      let group = groups.get(key);

      if (!group) {
        group = {
          key,
          label: this.formatGroupLabel(workout.completedAt),
          workouts: [],
        };
        groups.set(key, group);
      }

      group.workouts.push(workout);
    }

    return Array.from(groups.values());
  }

  get availableMonths(): Date[] {
    const months = new Map<string, Date>();

    for (const workout of this.workouts) {
      if (!workout.completedAt) {
        continue;
      }

      const month = new Date(
        workout.completedAt.getFullYear(),
        workout.completedAt.getMonth(),
        1,
      );
      months.set(`${month.getFullYear()}-${month.getMonth()}`, month);
    }

    return Array.from(months.values()).sort((first, second) => first.getTime() - second.getTime());
  }

  get workoutCountsByDate(): Record<string, number> {
    return this.workoutGroups.reduce<Record<string, number>>((counts, group) => {
      counts[group.key] = group.workouts.length;
      return counts;
    }, {});
  }

  openCalendar(): void {
    this.isCalendarOpen = true;
  }

  closeCalendar(): void {
    this.isCalendarOpen = false;
  }

  previewCalendarDate(date: Date): void {
    this.selectedDateKey = this.toDateKey(date);
  }

  selectCalendarDate(date: Date): void {
    this.selectedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dateKey = this.toDateKey(date);
    this.selectedDateKey = dateKey;
    this.closeCalendar();

    window.setTimeout(() => {
      document.getElementById(this.groupElementId(dateKey))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 250);
  }

  isHighlightedGroup(group: WorkoutDateGroup): boolean {
    return group.key === this.selectedDateKey;
  }

  groupElementId(group: WorkoutDateGroup | string): string {
    return `history-date-${typeof group === 'string' ? group : group.key}`;
  }

  formatWorkoutType(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  formatDuration(workout: WorkoutHistoryEntry): string {
    const actualDurationSeconds = workout.actualDurationSeconds;

    if (typeof actualDurationSeconds === 'number' && Number.isFinite(actualDurationSeconds)) {
      const totalSeconds = Math.max(0, Math.floor(actualDurationSeconds));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${workout.durationMinutes}:00`;
  }

  formatCompletedTime(workout: WorkoutHistoryEntry): string {
    if (!workout.completedAt) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(workout.completedAt);
  }

  workoutIcon(workoutType: WorkoutHistoryEntry['workoutType']): string {
    switch (workoutType) {
      case 'strength':
        return 'barbell-outline';
      case 'cardio':
        return 'walk-outline';
      case 'mobility':
        return 'body-outline';
      case 'yoga':
        return 'leaf-outline';
      default:
        return 'body-outline';
    }
  }

  trackByWorkoutId(_: number, workout: WorkoutHistoryEntry): string {
    return workout.id;
  }

  trackByGroupKey(_: number, group: WorkoutDateGroup): string {
    return group.key;
  }

  private getInitialMonth(): Date | null {
    if (this.workouts.length === 0) {
      return null;
    }

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasCurrentMonthWorkout = this.workouts.some((workout) => workout.completedAt
      && workout.completedAt.getFullYear() === currentMonth.getFullYear()
      && workout.completedAt.getMonth() === currentMonth.getMonth());

    if (hasCurrentMonthWorkout) {
      return currentMonth;
    }

    const latestWorkout = this.workouts.find((workout) => workout.completedAt);

    return latestWorkout?.completedAt
      ? new Date(latestWorkout.completedAt.getFullYear(), latestWorkout.completedAt.getMonth(), 1)
      : null;
  }

  private calculateCurrentDayStreak(): number {
    const workoutDays = new Set(this.workouts
      .filter((workout): workout is WorkoutHistoryEntry & { completedAt: Date } => workout.completedAt !== null)
      .map((workout) => this.toDateKey(workout.completedAt)));
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    if (!workoutDays.has(this.toDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;

    while (workoutDays.has(this.toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  private formatGroupLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.toDateKey(date) === this.toDateKey(today)) {
      return 'Today';
    }

    if (this.toDateKey(date) === this.toDateKey(yesterday)) {
      return 'Yesterday';
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    };

    if (date.getFullYear() !== today.getFullYear()) {
      formatOptions.year = 'numeric';
    }

    return new Intl.DateTimeFormat('en-US', formatOptions).format(date);
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
