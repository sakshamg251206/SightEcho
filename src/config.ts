/**
 * Build-time configuration. Only variables prefixed with VITE_ are exposed to
 * the browser, so never put secrets here.
 */
export const config = {
  /** Pre-fills the model download field, e.g. a self-hosted copy of the model. */
  defaultModelUrl: (import.meta.env.VITE_MODEL_URL ?? '').trim(),
};
