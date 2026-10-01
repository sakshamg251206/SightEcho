import { describe, expect, it } from 'vitest';
import { createOpfsModelStore, modelNameFromUrl } from '../../src/services/modelStore';

/** A minimal in-memory Origin Private File System. */
function fakeStorage(quota = Infinity) {
  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  const dir = {
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name)) {
        if (!options?.create) throw new DOMException('missing', 'NotFoundError');
        files.set(name, new Uint8Array());
      }
      return {
        async getFile() {
          return new File([files.get(name) ?? new Uint8Array()], name);
        },
        async createWritable() {
          const chunks: Uint8Array<ArrayBuffer>[] = [];
          const commit = () => {
            const size = chunks.reduce((n, c) => n + c.byteLength, 0);
            const all = new Uint8Array(size);
            let offset = 0;
            for (const c of chunks) {
              all.set(c, offset);
              offset += c.byteLength;
            }
            files.set(name, all);
          };
          const stream = new WritableStream<Uint8Array<ArrayBuffer>>({
            write(chunk) {
              chunks.push(chunk);
            },
            close: commit,
          });
          return Object.assign(stream, {
            async write(data: string) {
              chunks.push(new TextEncoder().encode(data));
            },
            async close() {
              commit();
            },
          });
        },
      };
    },
    async removeEntry(name: string) {
      if (!files.delete(name)) throw new DOMException('missing', 'NotFoundError');
    },
  };
  const storage = {
    getDirectory: async () => dir,
    estimate: async () => ({ quota, usage: 0 }),
    persist: async () => true,
  } as unknown as StorageManager;
  return { storage, files };
}

const streamOf = (...chunks: number[][]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(new Uint8Array(c)));
      controller.close();
    },
  });

describe('OPFS model store', () => {
  it('saves a model, reports progress and reads it back', async () => {
    const { storage } = fakeStorage();
    const store = createOpfsModelStore(storage);
    const progress: number[] = [];

    expect(await store.info()).toBeNull();
    const info = await store.save('gemma.task', streamOf([1, 2], [3]), {
      size: 3,
      onProgress: (n) => progress.push(n),
    });

    expect(info).toMatchObject({ name: 'gemma.task', size: 3 });
    expect(progress).toEqual([2, 3]);
    expect(await store.info()).toMatchObject({ name: 'gemma.task', size: 3 });
    expect(new Uint8Array(await (await store.open()).arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it('discards an incomplete download', async () => {
    const { storage, files } = fakeStorage();
    const store = createOpfsModelStore(storage);
    await expect(store.save('m', streamOf([1]), { size: 10 })).rejects.toThrow(/incomplete/);
    expect(files.size).toBe(0);
    expect(await store.info()).toBeNull();
  });

  it('refuses to start when the device lacks space', async () => {
    const { storage } = fakeStorage(5);
    const store = createOpfsModelStore(storage);
    await expect(store.save('m', streamOf([1]), { size: 10 })).rejects.toMatchObject({
      name: 'QuotaExceededError',
    });
  });

  it('removes the model', async () => {
    const { storage } = fakeStorage();
    const store = createOpfsModelStore(storage);
    await store.save('m', streamOf([1]), {});
    await store.remove();
    expect(await store.info()).toBeNull();
  });
});

describe('modelNameFromUrl', () => {
  it('uses the last path segment', () => {
    expect(modelNameFromUrl('https://example.com/models/gemma-4-E2B-it-web.task?download=1')).toBe(
      'gemma-4-E2B-it-web.task',
    );
  });

  it('falls back for invalid addresses', () => {
    expect(modelNameFromUrl('not a url')).toBe('model');
  });
});
