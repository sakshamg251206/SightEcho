/** A short vibration confirms a tap without needing to see the screen. */
export function pulse(pattern: number | number[] = 30): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported or blocked; feedback is a nice-to-have.
  }
}
