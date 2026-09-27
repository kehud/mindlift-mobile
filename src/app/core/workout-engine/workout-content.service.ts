import { Injectable } from '@angular/core';

import { WORKOUT_TYPE_OPTIONS } from '../workout-setup/workout-setup-options';

import type { WorkoutCueTemplate } from './models/workout-cue-template.models';

const LOCAL_CUE_TEMPLATES = [
  {
    id: 'female_relaxed_warmup_01',
    enabled: true,
    slot: 'intro',
    workoutTypes: WORKOUT_TYPE_OPTIONS.map((option) => option.value),
    coachingTones: ['calm'],
    languages: ['he'],
    stepTypes: ['warmup'],
    category: 'focus',
    channel: 'spoken',
    timing: 'before-step',
    priority: 'high',
    text: 'הגעת לאימון, זה כבר הניצחון הראשון שלך.',
    variables: [],
    audio: {
      role: 'voice',
      voiceKey: 'female',
      sourceUrl: 'assets/audio/female/relaxed/warmup/female_relaxed_warmup_01.mp3',
    },
  },
] as const satisfies readonly WorkoutCueTemplate[];

@Injectable({
  providedIn: 'root',
})
export class WorkoutContentService {
  getCueTemplates(): readonly WorkoutCueTemplate[] {
    return LOCAL_CUE_TEMPLATES;
  }
}
