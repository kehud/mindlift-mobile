import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Injectable({
  providedIn: 'root',
})
export class WorkoutHapticsService {
  private readonly isNativePlatform = Capacitor.isNativePlatform();

  async workoutStarted(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.error('Failed to trigger workout start haptic.', error);
    }
  }

  async workoutCompleted(): Promise<void> {
    if (!this.isNativePlatform) {
      return;
    }

    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.error('Failed to trigger workout completion haptic.', error);
    }
  }
}
