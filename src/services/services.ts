import { createContext, useContext } from 'react';
import type { Capabilities } from '../lib/capabilities';
import type { CreateDescriber } from './describer';
import type { ModelStore } from './modelStore';
import type { Speaker } from './speaker';

/**
 * Everything that touches device hardware or heavy runtimes. Injected through
 * context so the whole UI can be exercised in tests with lightweight fakes.
 */
export interface Services {
  detectCapabilities: () => Promise<Capabilities>;
  createDescriber: CreateDescriber;
  modelStore: ModelStore | null;
  speaker: Speaker;
  /** Optional default download address from VITE_MODEL_URL. */
  defaultModelUrl: string;
}

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <ServicesContext.Provider>.');
  return services;
}
