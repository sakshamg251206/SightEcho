import { describe, expect, it } from 'vitest';
import { buildInstruction, buildPrompt, detectPromptFormat } from '../../src/lib/prompt';

describe('detectPromptFormat', () => {
  it.each([
    ['gemma-4-E2B-it-web.task', 'gemma4'],
    ['gemma-4-E4B-it-web.task', 'gemma4'],
    ['gemma-3n-E2B-it-int4-Web.litertlm', 'gemma3n'],
    ['Gemma3n_E4B.task', 'gemma3n'],
    ['model.bin', 'gemma4'],
  ] as const)('%s → %s', (name, format) => {
    expect(detectPromptFormat(name)).toBe(format);
  });
});

describe('buildPrompt', () => {
  const image = { id: 'frame' };

  it('wraps the image and instruction in Gemma 4 turn markers', () => {
    expect(buildPrompt('gemma4', 'Describe.', image)).toEqual([
      '<|turn>user\n',
      { imageSource: image },
      'Describe.<turn|>\n',
      '<|turn>model\n',
    ]);
  });

  it('uses Gemma 3n turn markers for Gemma 3n models', () => {
    expect(buildPrompt('gemma3n', 'Describe.', image)).toEqual([
      '<start_of_turn>user\n',
      { imageSource: image },
      'Describe.<end_of_turn>\n',
      '<start_of_turn>model\n',
    ]);
  });
});

describe('buildInstruction', () => {
  it('asks for the answer in the chosen language', () => {
    const text = buildInstruction({ mode: 'scene', detail: 'brief', languageName: 'Hindi' });
    expect(text).toContain('Answer only in Hindi.');
  });

  it('prioritises safety and keeps brief scene answers short', () => {
    const text = buildInstruction({ mode: 'scene', detail: 'brief', languageName: 'English' });
    expect(text).toMatch(/safety/);
    expect(text).toMatch(/at most two short sentences/);
  });

  it('allows longer answers when detailed', () => {
    const text = buildInstruction({ mode: 'scene', detail: 'detailed', languageName: 'English' });
    expect(text).toMatch(/at most five sentences/);
  });

  it('reads text verbatim and translates foreign text', () => {
    const text = buildInstruction({ mode: 'text', detail: 'detailed', languageName: 'Spanish' });
    expect(text).toMatch(/exactly as written/);
    expect(text).toMatch(/translate it into Spanish/);
  });

  it('forbids markdown, which would be read aloud literally', () => {
    const text = buildInstruction({ mode: 'text', detail: 'brief', languageName: 'English' });
    expect(text).toMatch(/Never use markdown/);
  });
});
