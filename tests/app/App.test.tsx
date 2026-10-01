import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ANSWER } from '../../src/hooks/useNarrator';
import {
  ALL_CAPABILITIES,
  fakeStore,
  installCameraMocks,
  renderApp,
  scriptedDescriber,
} from './fakes';

beforeEach(() => {
  localStorage.clear();
  installCameraMocks();
});

const describeButton = () => screen.findByRole('button', { name: 'Describe' });

describe('first visit', () => {
  it('explains what the app does and asks for a model', async () => {
    renderApp();
    expect(
      screen.getByRole('heading', { level: 1, name: /hear what’s in front of you/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
    expect(await screen.findByLabelText('Choose model file')).toBeInTheDocument();
  });

  it('explains why an unsupported browser cannot run the app', async () => {
    renderApp({ detectCapabilities: async () => ({ ...ALL_CAPABILITIES, webgpu: false }) });
    expect(
      await screen.findByRole('heading', { name: /this browser can’t run sightecho/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/WebGPU is unavailable/i)).toBeInTheDocument();
  });

  it('saves a chosen model file and opens the camera', async () => {
    const user = userEvent.setup();
    const { createDescriber, services } = renderApp();
    const file = new File([new Uint8Array(8)], 'gemma-3n-E2B-it-int4-Web.litertlm');

    await user.upload(await screen.findByLabelText('Choose model file'), file);

    await describeButton();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Describe' })).toBeEnabled());
    expect(services.modelStore?.save).toHaveBeenCalledWith(
      file.name,
      expect.any(ReadableStream),
      expect.objectContaining({ size: 8 }),
    );
    expect(createDescriber).toHaveBeenCalledWith(expect.objectContaining({ format: 'gemma3n' }));
  });

  it('loads the model for this visit only when storage is unavailable', async () => {
    const user = userEvent.setup();
    const store = fakeStore();
    renderApp({
      modelStore: store,
      detectCapabilities: async () => ({ ...ALL_CAPABILITIES, storage: false }),
    });
    expect(await screen.findByText(/cannot keep the model between visits/i)).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Choose model file'), new File(['x'], 'm.task'));
    expect(await describeButton()).toBeInTheDocument();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('shows a helpful error when the model fails to start', async () => {
    const user = userEvent.setup();
    renderApp({
      createDescriber: async () => {
        throw new Error('GPU device was lost');
      },
    });
    await user.upload(await screen.findByLabelText('Choose model file'), new File(['x'], 'm.task'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/ran out of graphics memory/i);
    expect(screen.getByLabelText('Choose model file')).toBeInTheDocument();
  });

  it('validates the download address', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(await screen.findByLabelText('Model address'), 'http://example.com/m.task');
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(screen.getByText(/full https:\/\/ address/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Model address')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('returning visit', () => {
  const stored = { name: 'gemma-4-E2B-it-web.task', size: 4, savedAt: 1 };

  it('starts the saved model automatically', async () => {
    const { createDescriber } = renderApp({ modelStore: fakeStore(stored) });
    await describeButton();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Describe' })).toBeEnabled());
    expect(createDescriber).toHaveBeenCalledWith(expect.objectContaining({ format: 'gemma4' }));
  });

  it('describes the scene and speaks each sentence as it streams', async () => {
    const user = userEvent.setup();
    const { speaker, describer } = renderApp({ modelStore: fakeStore(stored) });

    await user.click(await describeButton());

    expect(
      await screen.findByText('A door is ahead. A chair is on your left.'),
    ).toBeInTheDocument();
    expect(speaker.spoken).toEqual(['A door is ahead.', 'A chair is on your left.']);
    expect(screen.getByText(/answered on this device in/i)).toBeInTheDocument();
    expect(describer.instructions[0]).toMatch(/Answer only in English/);
  });

  it('reads text in the chosen language', async () => {
    const user = userEvent.setup();
    localStorage.setItem('sightecho:settings', JSON.stringify({ language: 'hi-IN' }));
    const { describer } = renderApp({ modelStore: fakeStore(stored) });

    await user.click(await screen.findByRole('button', { name: 'Read text' }));

    expect(await screen.findByText('Text in view')).toBeInTheDocument();
    expect(describer.instructions[0]).toMatch(/translate it into Hindi/);
  });

  it('gives guidance when the model returns nothing usable', async () => {
    const user = userEvent.setup();
    const empty = scriptedDescriber(['<turn|>']);
    const { speaker } = renderApp({
      modelStore: fakeStore(stored),
      createDescriber: async () => empty,
    });
    await user.click(await describeButton());
    expect(await screen.findByText(EMPTY_ANSWER)).toBeInTheDocument();
    expect(speaker.spoken).toEqual([EMPTY_ANSWER]);
  });

  it('can stop a slow answer', async () => {
    const user = userEvent.setup();
    let finish: (text: string) => void = () => undefined;
    const slow = scriptedDescriber([]);
    slow.describe = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    renderApp({ modelStore: fakeStore(stored), createDescriber: async () => slow });

    await user.click(await describeButton());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(slow.cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Stopping…' })).toBeDisabled();

    await act(async () => finish('Too late.'));
    expect(await describeButton()).toBeEnabled();
    expect(screen.queryByText('Too late.')).not.toBeInTheDocument();
  });

  it('shows camera errors with a retry', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          throw new DOMException('denied', 'NotAllowedError');
        }),
      },
    });
    renderApp({ modelStore: fakeStore(stored) });
    expect(await screen.findByText(/camera access was blocked/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Describe' })).toBeDisabled();
  });

  it('supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    const { describer } = renderApp({ modelStore: fakeStore(stored) });
    await describeButton();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Describe' })).toBeEnabled());
    await user.keyboard('t');
    await waitFor(() => expect(describer.describe).toHaveBeenCalledTimes(1));
    expect(describer.instructions[0]).toMatch(/Read out the visible text/);
  });
});

describe('settings', () => {
  const stored = { name: 'gemma-4-E2B-it-web.task', size: 4, savedAt: 1 };

  it('persists changes and stops speaking when turned off', async () => {
    const user = userEvent.setup();
    const { speaker } = renderApp({ modelStore: fakeStore(stored) });

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await user.selectOptions(within(dialog).getByLabelText('Answer language'), 'es-ES');
    await user.click(within(dialog).getByRole('radio', { name: 'Detailed' }));
    await user.click(within(dialog).getByRole('switch', { name: 'Read answers aloud' }));

    expect(JSON.parse(localStorage.getItem('sightecho:settings') ?? '{}')).toMatchObject({
      language: 'es-ES',
      detail: 'detailed',
      speak: false,
    });

    await user.click(within(dialog).getByRole('button', { name: 'Close settings' }));
    await user.click(screen.getByRole('button', { name: 'Describe' }));
    await screen.findByText('A door is ahead. A chair is on your left.');
    expect(speaker.spoken).toEqual([]);
  });

  it('removes the model and returns to setup', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const store = fakeStore(stored);
    const { describer } = renderApp({ modelStore: store });

    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Remove model' }));

    expect(await screen.findByLabelText('Choose model file')).toBeInTheDocument();
    expect(store.remove).toHaveBeenCalled();
    expect(describer.close).toHaveBeenCalled();
  });
});
