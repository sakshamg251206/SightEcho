/**
 * Turns raw model output into text that is safe to show and pleasant to hear.
 * Works on partial (still streaming) output too, so it never leaks a half
 * finished control token or "thinking" block into speech.
 */
export function cleanResponse(raw: string): string {
  let text = raw;

  // Gemma 4 may emit a reasoning channel before the answer. Drop it, including
  // one that has started but not yet closed while streaming.
  text = text.replace(/<\|channel>[\s\S]*?(<channel\|>|$)/g, '');

  // Control tokens from either chat template.
  text = text.replace(/<\|?\/?(turn|start_of_turn|end_of_turn|eos|bos)[^>]*>/g, '');
  text = text.replace(/<(turn|channel)\|>/g, '');
  // A control token cut off mid-stream ("<tur", "<|tu").
  text = text.replace(/<\|?[a-z_]*$/i, '');

  // Markdown that would be read aloud literally.
  text = text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+)\*(?!\w)/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1');

  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n+\s*/g, ' ')
    .trim();
}
