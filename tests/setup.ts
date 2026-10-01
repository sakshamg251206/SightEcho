import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom does not implement <dialog> modal APIs.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom's Blob has no stream(); real browsers do.
if (typeof Blob.prototype.stream !== 'function') {
  Blob.prototype.stream = function stream(this: Blob) {
    const read = () => this.arrayBuffer();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(new Uint8Array(await read()));
        controller.close();
      },
    });
  } as Blob['stream'];
}
