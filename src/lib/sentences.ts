/**
 * Splits streaming text into sentences as soon as they are complete, so speech
 * can start long before the model has finished answering.
 */
export class SentenceStream {
  private consumed = 0;
  private readonly segmenter: Intl.Segmenter;

  constructor(locale: string) {
    this.segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  }

  /**
   * Feed the full text generated so far. Returns sentences that became complete
   * since the previous call. When `done` is true the trailing remainder is
   * returned as well.
   */
  push(text: string, done = false): string[] {
    // The text may have been rewritten by cleanup (e.g. a removed token).
    // Never re-emit what was already spoken.
    if (text.length < this.consumed) this.consumed = text.length;

    const pending = text.slice(this.consumed);
    const segments = Array.from(this.segmenter.segment(pending), (s) => s.segment);
    // Without a following segment we cannot be sure the last one is finished
    // ("Dr." or "3." may continue), so hold it back until more text arrives.
    const complete = done ? segments : segments.slice(0, -1);

    const sentences: string[] = [];
    for (const segment of complete) {
      this.consumed += segment.length;
      const trimmed = segment.trim();
      if (trimmed) sentences.push(trimmed);
    }
    return sentences;
  }

  reset(): void {
    this.consumed = 0;
  }
}
