import { describe, expect, it } from 'vitest';
import { cleanResponse } from '../../src/lib/response';

describe('cleanResponse', () => {
  it('leaves plain sentences untouched', () => {
    expect(cleanResponse('A door is ahead of you.')).toBe('A door is ahead of you.');
  });

  it('strips end-of-turn tokens from both templates', () => {
    expect(cleanResponse('A chair.<turn|>')).toBe('A chair.');
    expect(cleanResponse('A chair.<end_of_turn>')).toBe('A chair.');
  });

  it('removes a completed Gemma 4 thinking block', () => {
    expect(cleanResponse('<|channel>thought\nlet me look<channel|>A red car.')).toBe('A red car.');
  });

  it('hides a thinking block that is still streaming', () => {
    expect(cleanResponse('<|channel>thought\nthe user wants')).toBe('');
  });

  it('drops a control token cut off mid-stream', () => {
    expect(cleanResponse('A cup on the table.<tu')).toBe('A cup on the table.');
    expect(cleanResponse('A cup.<|')).toBe('A cup.');
  });

  it('removes markdown that a speech engine would read literally', () => {
    const raw = '## Scene\n- **Stairs** going down\n- a *small* dog\n1. `EXIT` sign';
    expect(cleanResponse(raw)).toBe('Scene Stairs going down a small dog EXIT sign');
  });

  it('keeps arithmetic asterisks and hyphenated words', () => {
    expect(cleanResponse('Room 4 * 5 is well-lit.')).toBe('Room 4 * 5 is well-lit.');
  });

  it('collapses whitespace and newlines', () => {
    expect(cleanResponse('  A table.\n\n  Two chairs.  ')).toBe('A table. Two chairs.');
  });
});
