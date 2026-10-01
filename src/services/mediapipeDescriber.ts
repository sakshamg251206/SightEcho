import { LlmInference } from '@mediapipe/tasks-genai';
import { buildPrompt } from '../lib/prompt';
import type { CreateDescriber, VisionDescriber } from './describer';

/** Self-hosted runtime files, emitted by the Vite plugin in vite.config.ts. */
const WASM_BASE = `${import.meta.env.BASE_URL}mediapipe/`;

/** Prompt tokens include ~280 image tokens, so leave generous room for the answer. */
const MAX_TOKENS = 1280;

/**
 * Runs a Gemma multimodal model on the device's GPU through MediaPipe's
 * LLM Inference task. Nothing leaves the device.
 */
export const createMediapipeDescriber: CreateDescriber = async ({ file, format }) => {
  const llm = await LlmInference.createFromOptions(
    {
      wasmLoaderPath: `${WASM_BASE}genai_wasm_internal.js`,
      wasmBinaryPath: `${WASM_BASE}genai_wasm_internal.wasm`,
    },
    {
      // Streaming the file avoids holding a second multi-GB copy in memory.
      baseOptions: { modelAssetBuffer: file.stream().getReader() },
      maxTokens: MAX_TOKENS,
      maxNumImages: 1,
      topK: 32,
      temperature: 0.2,
      randomSeed: 1,
    },
  );

  const describer: VisionDescriber = {
    async describe(image, instruction, onPartial) {
      llm.clearCancelSignals();
      let text = '';
      const prompt = buildPrompt(format, instruction, image);
      // The listener receives only the newly generated tokens.
      const final = await llm.generateResponse(prompt, (delta) => {
        text += delta;
        onPartial?.(text);
      });
      return final || text;
    },
    cancel() {
      llm.cancelProcessing();
    },
    close() {
      llm.close();
    },
  };
  return describer;
};
