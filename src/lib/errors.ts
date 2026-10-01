/** Maps low-level browser and runtime errors to messages a person can act on. */
export function toUserMessage(error: unknown): string {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? error.message : String(error ?? '');

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow camera access for this site in your browser settings, then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is being used by another app. Close it and try again.';
    case 'QuotaExceededError':
      return 'There is not enough free storage on this device to keep the model. Free up some space and try again.';
    case 'AbortError':
      return 'The operation was cancelled.';
  }

  if (/out of memory|\boom\b|allocat|device (was )?lost|\bmemory\b/i.test(message)) {
    return 'This device ran out of graphics memory while running the model. Close other apps or tabs, or try the smaller E2B model.';
  }
  if (/webgpu|\badapter\b|\bgpu\b/i.test(message)) {
    return 'The model needs WebGPU, which is not available in this browser. Use a recent Chrome or Edge on Android or desktop.';
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'The download failed. Check your connection and that the address allows downloads from this site (CORS).';
  }

  return message ? `Something went wrong: ${message}` : 'Something went wrong. Please try again.';
}
