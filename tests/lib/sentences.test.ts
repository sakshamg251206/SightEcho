import { describe, expect, it } from 'vitest';
import { SentenceStream } from '../../src/lib/sentences';

describe('SentenceStream', () => {
  it('holds back the last sentence until more text arrives', () => {
    const stream = new SentenceStream('en');
    expect(stream.push('A door is ahead.')).toEqual([]);
    expect(stream.push('A door is ahead. There is')).toEqual(['A door is ahead.']);
  });

  it('flushes the remainder when done', () => {
    const stream = new SentenceStream('en');
    stream.push('One. Two');
    expect(stream.push('One. Two words.', true)).toEqual(['Two words.']);
  });

  it('never repeats a sentence across calls', () => {
    const stream = new SentenceStream('en');
    const spoken = [
      ...stream.push('First. Second. Th'),
      ...stream.push('First. Second. Third. Fourth'),
      ...stream.push('First. Second. Third. Fourth.', true),
    ];
    expect(spoken).toEqual(['First.', 'Second.', 'Third.', 'Fourth.']);
  });

  it('segments non-Latin scripts', () => {
    const stream = new SentenceStream('ja');
    expect(stream.push('前にドアがあります。左に椅子があります。', true)).toEqual([
      '前にドアがあります。',
      '左に椅子があります。',
    ]);
  });

  it('copes with text that shrinks after cleanup', () => {
    const stream = new SentenceStream('en');
    stream.push('Hello there. More');
    expect(stream.push('Hi.', true)).toEqual([]);
  });

  it('ignores whitespace-only segments', () => {
    const stream = new SentenceStream('en');
    expect(stream.push('   ', true)).toEqual([]);
  });
});
