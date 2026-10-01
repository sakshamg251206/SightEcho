import { beforeEach, describe, expect, it, vi } from 'vitest';

const llm = {
  generateResponse: vi.fn(),
  cancelProcessing: vi.fn(),
  clearCancelSignals: vi.fn(),
  close: vi.fn(),
};
const createFromOptions = vi.fn(async (..._args: unknown[]) => llm);

vi.mock('@mediapipe/tasks-genai', () => ({
  LlmInference: { createFromOptions: (...args: unknown[]) => createFromOptions(...args) },
}));

const { createMediapipeDescriber } = await import('../../src/services/mediapipeDescriber');

beforeEach(() => vi.clearAllMocks());

describe('createMediapipeDescriber', () => {
  it('loads the self-hosted runtime and streams the model file', async () => {
    await createMediapipeDescriber({ file: new Blob(['weights']), format: 'gemma4' });

    const [fileset, options] = createFromOptions.mock.calls[0] as [
      Record<string, string>,
      Record<string, unknown> & { baseOptions: { modelAssetBuffer: unknown } },
    ];
    expect(fileset.wasmLoaderPath).toBe('/mediapipe/genai_wasm_internal.js');
    expect(fileset.wasmBinaryPath).toBe('/mediapipe/genai_wasm_internal.wasm');
    expect(options).toMatchObject({ maxNumImages: 1 });
    expect(options.baseOptions.modelAssetBuffer).toHaveProperty('read');
  });

  it('accumulates streamed tokens and sends a templated multimodal prompt', async () => {
    llm.generateResponse.mockImplementation(
      async (_prompt: unknown, listener: (delta: string, done: boolean) => void) => {
        listener('A door', false);
        listener(' ahead.', true);
        return 'A door ahead.';
      },
    );
    const describer = await createMediapipeDescriber({ file: new Blob(['w']), format: 'gemma3n' });
    const partials: string[] = [];
    const image = document.createElement('canvas');

    const answer = await describer.describe(image, 'Describe.', (text) => partials.push(text));

    expect(answer).toBe('A door ahead.');
    expect(partials).toEqual(['A door', 'A door ahead.']);
    expect(llm.clearCancelSignals).toHaveBeenCalled();
    expect(llm.generateResponse.mock.calls[0]?.[0]).toEqual([
      '<start_of_turn>user\n',
      { imageSource: image },
      'Describe.<end_of_turn>\n',
      '<start_of_turn>model\n',
    ]);
  });

  it('forwards cancel and close to the runtime', async () => {
    const describer = await createMediapipeDescriber({ file: new Blob(['w']), format: 'gemma4' });
    describer.cancel();
    describer.close();
    expect(llm.cancelProcessing).toHaveBeenCalled();
    expect(llm.close).toHaveBeenCalled();
  });
});
