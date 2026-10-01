import type { PromptFormat } from '../lib/prompt';

/** Anything that can turn a camera frame plus an instruction into words. */
export interface VisionDescriber {
  /**
   * Generates an answer. `onPartial` receives the full text generated so far
   * each time new tokens arrive.
   */
  describe(
    image: HTMLCanvasElement,
    instruction: string,
    onPartial?: (text: string) => void,
  ): Promise<string>;
  /** Stops the current generation as soon as the runtime allows. */
  cancel(): void;
  /** Releases GPU memory. */
  close(): void;
}

export interface DescriberSource {
  /** The model file (from the device store or the file picker). */
  file: Blob;
  format: PromptFormat;
}

export type CreateDescriber = (source: DescriberSource) => Promise<VisionDescriber>;
