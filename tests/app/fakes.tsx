import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../../src/App';
import type { Capabilities } from '../../src/lib/capabilities';
import type { DescriberSource, VisionDescriber } from '../../src/services/describer';
import type { ModelStore, StoredModelInfo } from '../../src/services/modelStore';
import { ServicesContext, type Services } from '../../src/services/services';
import type { Speaker } from '../../src/services/speaker';

export const ALL_CAPABILITIES: Capabilities = {
  secureContext: true,
  camera: true,
  webgpu: true,
  speech: true,
  storage: true,
};

export function fakeSpeaker(): Speaker & { spoken: string[] } {
  const spoken: string[] = [];
  return {
    spoken,
    available: true,
    speak: vi.fn((text: string) => {
      spoken.push(text);
    }),
    cancel: vi.fn(),
    hasVoiceFor: vi.fn(() => true),
  };
}

export function fakeStore(initial: StoredModelInfo | null = null): ModelStore {
  let info = initial;
  return {
    info: vi.fn(async () => info),
    open: vi.fn(async () => new File([new Uint8Array(4)], info?.name ?? 'model')),
    save: vi.fn(async (name, source, { onProgress } = {}) => {
      let size = 0;
      const reader = source.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        onProgress?.(size);
      }
      info = { name, size, savedAt: 1 };
      return info;
    }),
    remove: vi.fn(async () => {
      info = null;
    }),
  };
}

/** A describer whose answers are scripted by the test. */
export function scriptedDescriber(chunks: string[]) {
  const describer: VisionDescriber & { instructions: string[] } = {
    instructions: [],
    describe: vi.fn(async (_image, instruction, onPartial) => {
      describer.instructions.push(instruction);
      let text = '';
      for (const chunk of chunks) {
        text += chunk;
        onPartial?.(text);
        await Promise.resolve();
      }
      return text;
    }),
    cancel: vi.fn(),
    close: vi.fn(),
  };
  return describer;
}

export function installCameraMocks() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const getUserMedia = vi.fn(async () => stream);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1280);
  vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(720);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>);
  return { getUserMedia, track };
}

export function renderApp(overrides: Partial<Services> = {}) {
  const speaker = fakeSpeaker();
  const describer = scriptedDescriber(['A door is ahead. ', 'A chair is on your left.']);
  const createDescriber = vi.fn(async (_source: DescriberSource) => describer);
  const services: Services = {
    detectCapabilities: async () => ALL_CAPABILITIES,
    createDescriber,
    modelStore: fakeStore(),
    speaker,
    defaultModelUrl: '',
    ...overrides,
  };
  const utils = render(
    <ServicesContext.Provider value={services}>
      <App />
    </ServicesContext.Provider>,
  );
  return { ...utils, services, speaker, describer, createDescriber };
}
