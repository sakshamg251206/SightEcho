import { describe, expect, it } from 'vitest';
import { installFraction, modelReducer, type ModelState } from '../../src/hooks/modelState';

describe('modelReducer', () => {
  it('walks the happy path from install to ready', () => {
    let state: ModelState = { status: 'checking' };
    state = modelReducer(state, { type: 'needs-model' });
    state = modelReducer(state, { type: 'install', name: 'm.task', total: 100 });
    state = modelReducer(state, { type: 'progress', received: 40 });
    expect(installFraction(state)).toBe(0.4);
    state = modelReducer(state, { type: 'start', name: 'm.task' });
    state = modelReducer(state, { type: 'ready' });
    expect(state).toEqual({ status: 'ready', name: 'm.task' });
  });

  it('returns to the picker with an error on failure', () => {
    const state = modelReducer(
      { status: 'starting', name: 'm' },
      { type: 'failed', error: 'nope' },
    );
    expect(state).toEqual({ status: 'needs-model', error: 'nope' });
  });

  it('ignores stray progress and ready events', () => {
    const picker: ModelState = { status: 'needs-model' };
    expect(modelReducer(picker, { type: 'progress', received: 5 })).toBe(picker);
    expect(modelReducer(picker, { type: 'ready' })).toBe(picker);
  });

  it('reports unknown progress when the size is unknown', () => {
    expect(installFraction({ status: 'installing', name: 'm', received: 10 })).toBeUndefined();
  });
});
