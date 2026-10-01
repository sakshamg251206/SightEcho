import { describe, expect, it } from 'vitest';
import { blockingProblems, detectCapabilities } from '../../src/lib/capabilities';
import { toUserMessage } from '../../src/lib/errors';
import { formatBytes, formatSeconds } from '../../src/lib/format';
import { fitWithin } from '../../src/lib/frame';

describe('fitWithin', () => {
  it('scales the longest side down to the limit', () => {
    expect(fitWithin({ width: 1920, height: 1080 }, 768)).toEqual({ width: 768, height: 432 });
    expect(fitWithin({ width: 720, height: 1280 }, 768)).toEqual({ width: 432, height: 768 });
  });

  it('never scales up', () => {
    expect(fitWithin({ width: 640, height: 480 }, 768)).toEqual({ width: 640, height: 480 });
  });

  it('rejects an empty frame', () => {
    expect(() => fitWithin({ width: 0, height: 0 }, 768)).toThrow(/not produced a frame/);
  });
});

describe('formatBytes / formatSeconds', () => {
  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(3.2 * 1024 ** 3)).toBe('3.2 GB');
    expect(formatBytes(-1)).toBe('—');
  });

  it('formats durations', () => {
    expect(formatSeconds(1234)).toBe('1.2 s');
  });
});

describe('toUserMessage', () => {
  it.each([
    [new DOMException('x', 'NotAllowedError'), /Camera access was blocked/],
    [new DOMException('x', 'NotFoundError'), /No camera/],
    [new DOMException('x', 'NotReadableError'), /another app/],
    [new DOMException('x', 'QuotaExceededError'), /not enough free storage/],
    [new Error('GPU device lost: out of memory'), /ran out of graphics memory/],
    [new Error('No WebGPU adapter'), /WebGPU/],
    [new TypeError('Failed to fetch'), /download failed/],
    [new Error('boom'), /Something went wrong: boom/],
    [undefined, /Something went wrong\. Please try again\./],
  ])('%s', (error, expected) => {
    expect(toUserMessage(error)).toMatch(expected);
  });
});

describe('capabilities', () => {
  it('detects a fully capable browser', async () => {
    const scope = {
      isSecureContext: true,
      speechSynthesis: {},
      navigator: {
        mediaDevices: { getUserMedia: () => undefined },
        gpu: { requestAdapter: async () => ({}) },
        storage: { getDirectory: () => undefined },
      },
    } as unknown as typeof globalThis;
    const caps = await detectCapabilities(scope);
    expect(caps).toEqual({
      secureContext: true,
      camera: true,
      webgpu: true,
      speech: true,
      storage: true,
    });
    expect(blockingProblems(caps)).toEqual([]);
  });

  it('reports missing WebGPU and insecure contexts in priority order', async () => {
    const scope = {
      isSecureContext: false,
      navigator: { gpu: { requestAdapter: async () => null } },
    } as unknown as typeof globalThis;
    const caps = await detectCapabilities(scope);
    expect(blockingProblems(caps)).toEqual(['secureContext', 'webgpu', 'camera']);
  });

  it('treats a throwing adapter request as unsupported', async () => {
    const scope = {
      isSecureContext: true,
      navigator: {
        gpu: {
          requestAdapter: async () => {
            throw new Error('blocked');
          },
        },
      },
    } as unknown as typeof globalThis;
    expect((await detectCapabilities(scope)).webgpu).toBe(false);
  });
});
