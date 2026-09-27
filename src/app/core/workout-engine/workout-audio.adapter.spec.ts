import { TestBed } from '@angular/core/testing';

import type { WorkoutAudio, WorkoutCue } from './models/workout-timeline.models';
import { WORKOUT_AUDIO_ELEMENT_FACTORY, WorkoutAudioAdapter } from './workout-audio.adapter';

describe('WorkoutAudioAdapter', () => {
  let adapter: WorkoutAudioAdapter;
  let createAudio: jasmine.Spy<() => HTMLAudioElement>;
  let elements: jasmine.SpyObj<HTMLAudioElement>[];
  const cue: WorkoutCue = {
    id: 'opening-cue', stepId: 'warmup', category: 'focus', channel: 'spoken',
    timing: 'before-step', priority: 'high', text: 'Opening', offsetSeconds: 0,
    audioId: 'opening-audio',
  };
  const audio: WorkoutAudio = {
    id: 'opening-audio', role: 'voice', sourceUrl: 'assets/audio/opening.mp3',
  };

  beforeEach(() => {
    elements = [];
    createAudio = jasmine.createSpy<() => HTMLAudioElement>('createAudio').and.callFake(() => {
      const element = jasmine.createSpyObj<HTMLAudioElement>(
        'audio', ['play', 'pause', 'removeAttribute', 'load'],
      );
      element.play.and.resolveTo();
      element.currentTime = 0;
      elements.push(element);
      return element;
    });
    TestBed.configureTestingModule({
      providers: [{ provide: WORKOUT_AUDIO_ELEMENT_FACTORY, useValue: createAudio }],
    });
    adapter = TestBed.inject(WorkoutAudioAdapter);
  });

  it('plays the resolved source once per cue/audio presentation, even after it ends', () => {
    adapter.handlePresentedCue(cue, audio);
    const element = elements[0];
    adapter.handlePresentedCue(cue, audio);
    expect(element.src).toBe(audio.sourceUrl);
    expect(element.play).toHaveBeenCalledTimes(1);

    element.onended!.call(element, new Event('ended'));
    adapter.handlePresentedCue(cue, audio);
    expect(createAudio).toHaveBeenCalledTimes(1);
    expect(element.removeAttribute).toHaveBeenCalledWith('src');
    expect(element.load).toHaveBeenCalledTimes(1);
  });

  it('ignores cues without resolved matching audio', () => {
    adapter.handlePresentedCue(cue);
    adapter.handlePresentedCue({ ...cue, audioId: undefined }, audio);
    adapter.handlePresentedCue(cue, { ...audio, id: 'wrong-audio' });
    adapter.handlePresentedCue(cue, { ...audio, sourceUrl: '' });
    expect(createAudio).not.toHaveBeenCalled();
  });

  it('releases the previous clip before starting another presented cue', () => {
    adapter.handlePresentedCue(cue, audio);
    adapter.handlePresentedCue({ ...cue, id: 'next-cue' }, audio);
    expect(elements[0].pause).toHaveBeenCalledBefore(elements[1].play);
    expect(elements[0].load).toHaveBeenCalledBefore(elements[1].play);
    expect(elements[0].onended).toBeNull();
    expect(elements[0].onerror).toBeNull();
    expect(elements[1].play).toHaveBeenCalledTimes(1);
  });

  it('pauses and resumes the same element without resetting its position', () => {
    adapter.handlePresentedCue(cue, audio);
    const element = elements[0];
    element.currentTime = 1.5;
    adapter.pause();
    adapter.pause();
    expect(element.pause).toHaveBeenCalledTimes(1);
    adapter.resume();
    adapter.resume();
    expect(element.play).toHaveBeenCalledTimes(2);
    expect(element.currentTime).toBe(1.5);
    expect(createAudio).toHaveBeenCalledTimes(1);
  });

  it('holds a presented clip while paused until resume', () => {
    adapter.pause();
    adapter.handlePresentedCue(cue, audio);
    expect(elements[0].play).not.toHaveBeenCalled();
    adapter.resume();
    expect(elements[0].play).toHaveBeenCalledTimes(1);
  });

  it('stops without replaying and allows the same cue in a new session after reset', () => {
    adapter.handlePresentedCue(cue, audio);
    adapter.stop();
    adapter.pause();
    adapter.resume();
    adapter.handlePresentedCue(cue, audio);
    expect(elements[0].play).toHaveBeenCalledTimes(1);
    expect(elements[0].removeAttribute).toHaveBeenCalledWith('src');
    adapter.reset();
    adapter.handlePresentedCue(cue, audio);
    expect(createAudio).toHaveBeenCalledTimes(2);
  });

  it('releases audio on cleanup and media error', () => {
    adapter.handlePresentedCue(cue, audio);
    elements[0].onerror!.call(elements[0], new Event('error'));
    expect(elements[0].load).toHaveBeenCalledTimes(1);
    adapter.handlePresentedCue({ ...cue, id: 'next-cue' }, audio);
    adapter.ngOnDestroy();
    expect(elements[1].pause).toHaveBeenCalledTimes(1);
    expect(elements[1].removeAttribute).toHaveBeenCalledWith('src');
    expect(elements[1].onerror).toBeNull();
  });

  it('handles play rejection without retrying the presented cue', async () => {
    adapter.pause();
    adapter.handlePresentedCue(cue, audio);
    elements[0].play.and.rejectWith(new Error('Autoplay blocked'));
    adapter.resume();
    await Promise.resolve();
    expect(elements[0].load).toHaveBeenCalledTimes(1);
    adapter.handlePresentedCue(cue, audio);
    expect(createAudio).toHaveBeenCalledTimes(1);
  });

  it('handles a synchronous play failure safely', () => {
    adapter.pause();
    adapter.handlePresentedCue(cue, audio);
    elements[0].play.and.throwError('Playback unavailable');
    expect(() => adapter.resume()).not.toThrow();
    expect(elements[0].load).toHaveBeenCalledTimes(1);
  });

  it('ignores a stale rejection after replacing a clip', async () => {
    let rejectPlay!: (reason: Error) => void;
    adapter.pause();
    adapter.handlePresentedCue(cue, audio);
    elements[0].play.and.returnValue(new Promise<void>((_resolve, reject) => { rejectPlay = reject; }));
    adapter.resume();
    adapter.handlePresentedCue({ ...cue, id: 'next-cue' }, audio);
    rejectPlay(new Error('Previous play interrupted'));
    await Promise.resolve();
    expect(elements[1].pause).not.toHaveBeenCalled();
    expect(elements[1].load).not.toHaveBeenCalled();
  });

  it('ignores an interrupted play rejection after pause and resume', async () => {
    let rejectPlay!: (reason: Error) => void;
    adapter.pause();
    adapter.handlePresentedCue(cue, audio);
    const element = elements[0];
    element.play.and.returnValue(new Promise<void>((_resolve, reject) => { rejectPlay = reject; }));
    adapter.resume();
    adapter.pause();
    element.play.and.resolveTo();
    adapter.resume();
    rejectPlay(new Error('Play interrupted by pause'));
    await Promise.resolve();
    expect(element.load).not.toHaveBeenCalled();
    expect(element.play).toHaveBeenCalledTimes(2);
  });
});
