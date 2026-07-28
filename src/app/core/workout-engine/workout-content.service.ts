import { Injectable } from '@angular/core';

import type { WorkoutCueTemplate } from './models/workout-cue-template.models';

@Injectable({
  providedIn: 'root',
})
export class WorkoutContentService {
  getCueTemplates(): readonly WorkoutCueTemplate[] {
    return [];
  }
}
