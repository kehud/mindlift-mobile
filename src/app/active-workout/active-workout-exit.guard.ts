import type { CanDeactivateFn } from '@angular/router';

import { ActiveWorkoutPage } from './active-workout.page';

export const activeWorkoutExitGuard: CanDeactivateFn<ActiveWorkoutPage> = (
  component,
) => component.canLeaveActiveWorkout();
