import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { blockingProblems, type Capabilities } from '../lib/capabilities';
import { toUserMessage } from '../lib/errors';
import { detectPromptFormat } from '../lib/prompt';
import type { VisionDescriber } from '../services/describer';
import { fetchModel, modelNameFromUrl } from '../services/modelStore';
import { useServices } from '../services/services';
import { modelReducer } from './modelState';

export function useModel() {
  const { detectCapabilities, createDescriber, modelStore } = useServices();
  const [state, dispatch] = useReducer(modelReducer, { status: 'checking' });
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [describer, setDescriber] = useState<VisionDescriber | null>(null);
  const [modelSize, setModelSize] = useState<number | null>(null);
  const describerRef = useRef<VisionDescriber | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const store = capabilities?.storage ? modelStore : null;

  const start = useCallback(
    async (file: Blob, name: string) => {
      dispatch({ type: 'start', name });
      setModelSize(file.size);
      describerRef.current?.close();
      describerRef.current = null;
      setDescriber(null);
      try {
        const created = await createDescriber({ file, format: detectPromptFormat(name) });
        describerRef.current = created;
        setDescriber(created);
        dispatch({ type: 'ready' });
      } catch (error) {
        dispatch({ type: 'failed', error: toUserMessage(error) });
      }
    },
    [createDescriber],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const caps = await detectCapabilities();
      if (cancelled) return;
      setCapabilities(caps);

      const problems = blockingProblems(caps);
      if (problems.length > 0) {
        dispatch({ type: 'unsupported', problems });
        return;
      }

      const saved = caps.storage ? await modelStore?.info() : null;
      if (cancelled) return;
      if (saved && modelStore) {
        try {
          await start(await modelStore.open(), saved.name);
        } catch (error) {
          dispatch({ type: 'failed', error: toUserMessage(error) });
        }
      } else {
        dispatch({ type: 'needs-model' });
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      describerRef.current?.close();
      describerRef.current = null;
    };
  }, [detectCapabilities, modelStore, start]);

  const install = useCallback(
    async (
      name: string,
      open: (signal: AbortSignal) => Promise<{ body: ReadableStream<Uint8Array>; size?: number }>,
      fallback: () => Promise<Blob>,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        if (!store) {
          // No persistent storage: load straight into memory for this visit only.
          dispatch({ type: 'install', name });
          await start(await fallback(), name);
          return;
        }
        const { body, size } = await open(controller.signal);
        dispatch({ type: 'install', name, total: size });
        await store.save(name, body, {
          size,
          signal: controller.signal,
          onProgress: (received) => dispatch({ type: 'progress', received }),
        });
        await start(await store.open(), name);
      } catch (error) {
        if (controller.signal.aborted) dispatch({ type: 'needs-model' });
        else dispatch({ type: 'failed', error: toUserMessage(error) });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [start, store],
  );

  const installFromFile = useCallback(
    (file: File) =>
      install(
        file.name,
        async () => ({ body: file.stream(), size: file.size }),
        async () => file,
      ),
    [install],
  );

  const installFromUrl = useCallback(
    (url: string) =>
      install(
        modelNameFromUrl(url),
        (signal) => fetchModel(url, signal),
        async () => {
          const { body } = await fetchModel(url, abortRef.current?.signal);
          return new Response(body).blob();
        },
      ),
    [install],
  );

  const cancelInstall = useCallback(() => abortRef.current?.abort(), []);

  const removeModel = useCallback(async () => {
    describerRef.current?.close();
    describerRef.current = null;
    setDescriber(null);
    setModelSize(null);
    await modelStore?.remove().catch(() => undefined);
    dispatch({ type: 'needs-model' });
  }, [modelStore]);

  return {
    state,
    capabilities,
    describer,
    modelSize,
    persistent: store !== null,
    installFromFile,
    installFromUrl,
    cancelInstall,
    removeModel,
  };
}
