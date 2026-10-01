/**
 * Chat-template families understood by the MediaPipe runtime. The turn markers
 * differ between Gemma generations, and the model answers poorly if they are
 * wrong, so the format is derived from the model file name.
 */
export type PromptFormat = 'gemma4' | 'gemma3n';

export type DescribeMode = 'scene' | 'text';
export type DetailLevel = 'brief' | 'detailed';

export interface InstructionOptions {
  mode: DescribeMode;
  detail: DetailLevel;
  /** English name of the answer language, e.g. "Hindi". */
  languageName: string;
}

/** A prompt is a list of text and image parts, mirroring MediaPipe's `Prompt` type. */
export type PromptPart<TImage> = string | { imageSource: TImage };

const TURN_MARKERS: Record<
  PromptFormat,
  { userStart: string; turnEnd: string; modelStart: string }
> = {
  gemma4: { userStart: '<|turn>user\n', turnEnd: '<turn|>\n', modelStart: '<|turn>model\n' },
  gemma3n: {
    userStart: '<start_of_turn>user\n',
    turnEnd: '<end_of_turn>\n',
    modelStart: '<start_of_turn>model\n',
  },
};

export function detectPromptFormat(modelFileName: string): PromptFormat {
  return /gemma[-_ ]?3n/i.test(modelFileName) ? 'gemma3n' : 'gemma4';
}

const SHARED_RULES = [
  'You are the eyes of a blind person who is holding up their phone camera.',
  'Speak directly to them in plain, natural sentences. Never use markdown, lists, emojis or headings.',
  'Do not mention the photo, the image or the camera; describe the world in front of them.',
];

export function buildInstruction({ mode, detail, languageName }: InstructionOptions): string {
  const lines = [...SHARED_RULES];

  if (mode === 'scene') {
    lines.push(
      'Say first anything that matters for safety or movement: obstacles, steps, traffic, people approaching.',
      'Give positions relative to them, such as "ahead", "on your left" or "within reach".',
      detail === 'brief'
        ? 'Answer in at most two short sentences.'
        : 'Answer in at most five sentences, covering layout, notable objects, people, colours and any visible text.',
    );
  } else {
    lines.push(
      'Read out the visible text exactly as written, in natural reading order.',
      'Skip text that is too blurry to read rather than guessing, and say if part of it is cut off.',
      'If there is no readable text, say so in one short sentence and briefly say what is visible instead.',
      detail === 'brief'
        ? 'For long documents, read the title and the first few lines only.'
        : 'Read all of the text, including small print.',
    );
  }

  lines.push(
    mode === 'text'
      ? `If the text is not in ${languageName}, read it as written and then translate it into ${languageName}.`
      : `Answer only in ${languageName}.`,
  );

  return lines.join(' ');
}

/** Wraps an instruction and an image in the model's chat template. */
export function buildPrompt<TImage>(
  format: PromptFormat,
  instruction: string,
  image: TImage,
): PromptPart<TImage>[] {
  const markers = TURN_MARKERS[format];
  return [
    markers.userStart,
    { imageSource: image },
    `${instruction}${markers.turnEnd}`,
    markers.modelStart,
  ];
}
