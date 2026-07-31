import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { WorkoutSetup } from '../core/workout-setup/workout-setup.model';
import {
  CoachingTone,
  COACHING_TONE_OPTIONS,
  WORKOUT_DURATION_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
  WorkoutDuration,
  WorkoutType,
} from '../core/workout-setup/workout-setup-options';
import { WorkoutSetupStateService } from '../core/workout-setup/workout-setup-state.service';
import { SelectionBottomSheetOption } from '../shared/selection-bottom-sheet/selection-bottom-sheet.component';

type SetupSheetField = 'workoutType' | 'duration' | 'coachingTone' | 'mainGoal';

const TODAY_INTENTION_OPTIONS: readonly SelectionBottomSheetOption[] = [
  { value: 'Build strength', label: 'Build strength' },
  { value: 'Boost energy', label: 'Boost energy' },
  { value: 'Clear my mind', label: 'Clear my mind' },
  { value: 'Move with ease', label: 'Move with ease' },
];

@Component({
  selector: 'app-workout-setup',
  templateUrl: 'workout-setup.page.html',
  styleUrls: ['workout-setup.page.scss'],
  standalone: false,
})
export class WorkoutSetupPage {
  private readonly alertController = inject(AlertController);
  private readonly router = inject(Router);
  private readonly workoutSetupState = inject(WorkoutSetupStateService);
  private initialSetup: WorkoutSetup | null = null;

  readonly workoutTypeOptions = WORKOUT_TYPE_OPTIONS;
  readonly durationOptions = WORKOUT_DURATION_OPTIONS;

  workoutType: WorkoutType | null = null;
  durationMinutes: WorkoutDuration | null = null;
  coachingTone: CoachingTone | null = null;
  mainGoal: string | null = null;
  activeSheet: SetupSheetField | null = null;

  get workoutTypeLabel(): string {
    return this.workoutTypeOptions.find((option) => option.value === this.workoutType)?.label ?? 'Choose';
  }

  get durationLabel(): string {
    return this.durationOptions.find((option) => option.value === this.durationMinutes)?.label ?? 'Choose';
  }

  get coachingToneLabel(): string {
    return COACHING_TONE_OPTIONS.find((option) => option.value === this.coachingTone)?.label ?? 'Choose';
  }

  get mainGoalLabel(): string {
    return this.mainGoal ?? 'Choose';
  }

  get sheetTitle(): string {
    switch (this.activeSheet) {
      case 'workoutType':
        return 'Focus area';
      case 'duration':
        return 'Duration';
      case 'coachingTone':
        return 'Coaching style';
      case 'mainGoal':
        return 'Today’s intention';
      default:
        return '';
    }
  }

  get sheetOptions(): readonly SelectionBottomSheetOption[] {
    switch (this.activeSheet) {
      case 'workoutType':
        return WORKOUT_TYPE_OPTIONS;
      case 'duration':
        return WORKOUT_DURATION_OPTIONS;
      case 'coachingTone':
        return COACHING_TONE_OPTIONS;
      case 'mainGoal':
        return this.mainGoalOptions;
      default:
        return [];
    }
  }

  get sheetSelectedValue(): string | number | null {
    switch (this.activeSheet) {
      case 'workoutType':
        return this.workoutType;
      case 'duration':
        return this.durationMinutes;
      case 'coachingTone':
        return this.coachingTone;
      case 'mainGoal':
        return this.mainGoal;
      default:
        return null;
    }
  }

  get canContinue(): boolean {
    return this.workoutType !== null && this.durationMinutes !== null;
  }

  async ionViewWillEnter(): Promise<void> {
    const setup = await this.workoutSetupState.prefillFromOnboardingProfile();

    this.applySetup(setup);
  }

  async continue(): Promise<void> {
    if (!this.canContinue) {
      return;
    }

    this.workoutSetupState.setWorkoutType(this.workoutType);
    this.workoutSetupState.setDurationMinutes(this.durationMinutes);
    this.workoutSetupState.setCoachingTone(this.coachingTone);
    this.workoutSetupState.setMainGoal(this.mainGoal);

    await this.router.navigateByUrl('/active-workout');
  }

  async closeSetup(): Promise<void> {
    if (!this.hasUnsavedChanges()) {
      await this.router.navigateByUrl('/home');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Discard workout setup?',
      message: 'Your changes will be lost.',
      buttons: [
        {
          text: 'Keep editing',
          role: 'cancel',
        },
        {
          text: 'Discard',
          role: 'destructive',
          handler: () => {
            void this.router.navigateByUrl('/home');
          },
        },
      ],
    });

    await alert.present();
  }

  openSheet(field: SetupSheetField): void {
    this.activeSheet = field;
  }

  closeSheet(): void {
    this.activeSheet = null;
  }

  selectSheetOption(value: string | number): void {
    switch (this.activeSheet) {
      case 'workoutType':
        this.workoutType = value as WorkoutType;
        break;
      case 'duration':
        this.durationMinutes = value as WorkoutDuration;
        break;
      case 'coachingTone':
        this.coachingTone = value as CoachingTone;
        break;
      case 'mainGoal':
        this.mainGoal = value as string;
        break;
      default:
        return;
    }

    this.closeSheet();
  }

  private applySetup(setup: WorkoutSetup): void {
    this.initialSetup = { ...setup };
    this.workoutType = setup.workoutType;
    this.durationMinutes = setup.durationMinutes;
    this.coachingTone = setup.coachingTone;
    this.mainGoal = setup.mainGoal;
  }

  private hasUnsavedChanges(): boolean {
    return this.initialSetup !== null
      && (this.workoutType !== this.initialSetup.workoutType
        || this.durationMinutes !== this.initialSetup.durationMinutes
        || this.coachingTone !== this.initialSetup.coachingTone
        || this.mainGoal !== this.initialSetup.mainGoal);
  }

  private get mainGoalOptions(): readonly SelectionBottomSheetOption[] {
    if (!this.mainGoal || TODAY_INTENTION_OPTIONS.some((option) => option.value === this.mainGoal)) {
      return TODAY_INTENTION_OPTIONS;
    }

    return [{ value: this.mainGoal, label: this.mainGoal }, ...TODAY_INTENTION_OPTIONS];
  }
}
