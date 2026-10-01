export interface Capabilities {
  /** Camera and storage APIs only exist on HTTPS or localhost. */
  secureContext: boolean;
  camera: boolean;
  webgpu: boolean;
  speech: boolean;
  /** Origin Private File System, used to keep the model between visits. */
  storage: boolean;
}

export type CapabilityProblem = keyof Capabilities;

export async function detectCapabilities(
  scope: typeof globalThis = globalThis,
): Promise<Capabilities> {
  const nav = scope.navigator as Navigator | undefined;
  return {
    secureContext: scope.isSecureContext === true,
    camera: typeof nav?.mediaDevices?.getUserMedia === 'function',
    webgpu: await hasWebGpuAdapter(nav),
    speech: 'speechSynthesis' in scope,
    storage: typeof nav?.storage?.getDirectory === 'function',
  };
}

async function hasWebGpuAdapter(nav: Navigator | undefined): Promise<boolean> {
  if (!nav?.gpu) return false;
  try {
    return (await nav.gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

/** Problems that make the app unusable, in the order they should be fixed. */
export function blockingProblems(caps: Capabilities): CapabilityProblem[] {
  const order: CapabilityProblem[] = ['secureContext', 'webgpu', 'camera'];
  return order.filter((key) => !caps[key]);
}

export const PROBLEM_TEXT: Record<CapabilityProblem, string> = {
  secureContext: 'This page must be opened over HTTPS (or on localhost) to use the camera.',
  webgpu:
    'This browser cannot run the on-device model because WebGPU is unavailable. Use a recent version of Chrome or Edge on Android, Windows, macOS or ChromeOS.',
  camera: 'This browser does not give web pages access to a camera.',
  speech:
    'This browser cannot speak text aloud. Answers will still be shown on screen and read by your screen reader.',
  storage:
    'This browser cannot keep the model between visits, so you will need to choose it again next time.',
};
