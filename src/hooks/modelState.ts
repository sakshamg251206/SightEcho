import type { CapabilityProblem } from '../lib/capabilities';

/** Lifecycle of the on-device model, from first visit to ready. */
export type ModelState =
  | { status: 'checking' }
  | { status: 'unsupported'; problems: CapabilityProblem[] }
  | { status: 'needs-model'; error?: string }
  | { status: 'installing'; name: string; received: number; total?: number }
  | { status: 'starting'; name: string }
  | { status: 'ready'; name: string };

export type ModelAction =
  | { type: 'unsupported'; problems: CapabilityProblem[] }
  | { type: 'needs-model' }
  | { type: 'install'; name: string; total?: number }
  | { type: 'progress'; received: number }
  | { type: 'start'; name: string }
  | { type: 'ready' }
  | { type: 'failed'; error: string };

export function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case 'unsupported':
      return { status: 'unsupported', problems: action.problems };
    case 'needs-model':
      return { status: 'needs-model' };
    case 'install':
      return { status: 'installing', name: action.name, received: 0, total: action.total };
    case 'progress':
      return state.status === 'installing' ? { ...state, received: action.received } : state;
    case 'start':
      return { status: 'starting', name: action.name };
    case 'ready':
      return state.status === 'starting' ? { status: 'ready', name: state.name } : state;
    case 'failed':
      return { status: 'needs-model', error: action.error };
  }
}

/** Install progress as a fraction from 0 to 1, or undefined when the size is unknown. */
export function installFraction(state: ModelState): number | undefined {
  if (state.status !== 'installing' || !state.total) return undefined;
  return Math.min(1, state.received / state.total);
}
