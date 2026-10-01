export interface StoredModelInfo {
  name: string;
  size: number;
  savedAt: number;
}

/**
 * Keeps the multi-gigabyte model file on the device so it only has to be
 * chosen or downloaded once.
 */
export interface ModelStore {
  info(): Promise<StoredModelInfo | null>;
  open(): Promise<File>;
  save(
    name: string,
    source: ReadableStream<Uint8Array>,
    options: { size?: number; onProgress?: (bytes: number) => void; signal?: AbortSignal },
  ): Promise<StoredModelInfo>;
  remove(): Promise<void>;
}

const MODEL_FILE = 'model.bin';
const INFO_FILE = 'model.json';

/** A store backed by the Origin Private File System (private to this site). */
export function createOpfsModelStore(storage: StorageManager = navigator.storage): ModelStore {
  const root = () => storage.getDirectory();

  async function remove(): Promise<void> {
    const dir = await root();
    // Delete the info file first: a model without info is treated as absent.
    for (const name of [INFO_FILE, MODEL_FILE]) {
      await dir.removeEntry(name).catch(() => undefined);
    }
  }

  return {
    async info() {
      try {
        const dir = await root();
        const file = await (await dir.getFileHandle(INFO_FILE)).getFile();
        const info = JSON.parse(await file.text()) as Partial<StoredModelInfo>;
        if (typeof info.name !== 'string' || typeof info.size !== 'number') return null;
        return { name: info.name, size: info.size, savedAt: Number(info.savedAt) || 0 };
      } catch {
        return null;
      }
    },

    async open() {
      const dir = await root();
      return (await dir.getFileHandle(MODEL_FILE)).getFile();
    },

    async save(name, source, { size, onProgress, signal } = {}) {
      if (size !== undefined) await assertFreeSpace(storage, size);
      // Ask the browser not to evict the model under storage pressure.
      await storage.persist?.().catch(() => false);

      await remove();
      const dir = await root();
      const handle = await dir.getFileHandle(MODEL_FILE, { create: true });
      const writable = await handle.createWritable();

      let written = 0;
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          written += chunk.byteLength;
          onProgress?.(written);
          controller.enqueue(chunk);
        },
      });

      try {
        await source.pipeThrough(counter).pipeTo(writable, { signal });
      } catch (error) {
        await remove();
        throw error;
      }

      if (size !== undefined && written !== size) {
        await remove();
        throw new Error(`The model file is incomplete (${written} of ${size} bytes).`);
      }

      const info: StoredModelInfo = { name, size: written, savedAt: Date.now() };
      const infoWritable = await (
        await dir.getFileHandle(INFO_FILE, { create: true })
      ).createWritable();
      await infoWritable.write(JSON.stringify(info));
      await infoWritable.close();
      return info;
    },

    remove,
  };
}

async function assertFreeSpace(storage: StorageManager, bytes: number): Promise<void> {
  const estimate = await storage.estimate?.().catch(() => undefined);
  if (!estimate?.quota) return;
  const free = estimate.quota - (estimate.usage ?? 0);
  if (free < bytes) {
    throw new DOMException('Not enough storage for the model.', 'QuotaExceededError');
  }
}

/** Starts a model download and reports its name and size before streaming. */
export async function fetchModel(
  url: string,
  signal?: AbortSignal,
): Promise<{ name: string; size?: number; body: ReadableStream<Uint8Array> }> {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) {
    throw new Error(`The model download failed (HTTP ${response.status}).`);
  }
  const length = Number(response.headers.get('Content-Length'));
  return {
    name: modelNameFromUrl(url),
    size: Number.isFinite(length) && length > 0 ? length : undefined,
    body: response.body,
  };
}

export function modelNameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : 'model';
  } catch {
    return 'model';
  }
}
