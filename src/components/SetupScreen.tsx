import { useId, useState, type FormEvent } from 'react';
import { PROBLEM_TEXT, type Capabilities } from '../lib/capabilities';
import { formatBytes } from '../lib/format';
import { installFraction, type ModelState } from '../hooks/modelState';
import { Icon } from './Icon';
import { Notice } from './Notice';
import { ProgressBar } from './ProgressBar';
import { Spinner } from './Spinner';

const MODEL_ACCEPT = '.task,.litertlm';

/** Pre-converted browser builds published by Google's LiteRT community. */
const MODEL_LINKS = [
  {
    name: 'Gemma 4 E2B',
    note: 'Recommended for phones',
    href: 'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/blob/main/gemma-4-E2B-it-web.task',
  },
  {
    name: 'Gemma 4 E4B',
    note: 'More detailed, needs more memory',
    href: 'https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/blob/main/gemma-4-E4B-it-web.task',
  },
  {
    name: 'Gemma 3n E2B',
    note: 'Older generation',
    href: 'https://huggingface.co/google/gemma-3n-E2B-it-litert-lm/blob/main/gemma-3n-E2B-it-int4-Web.litertlm',
  },
];

interface SetupScreenProps {
  state: ModelState;
  capabilities: Capabilities | null;
  persistent: boolean;
  defaultModelUrl: string;
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
  onCancel: () => void;
}

export function SetupScreen(props: SetupScreenProps) {
  const { state } = props;
  return (
    <div className="setup">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero__title">
          Hear what’s in front of you.
        </h1>
        <p className="hero__lead">
          SightEcho describes your surroundings and reads text aloud, in your language, using an AI
          model that runs entirely on this device. Point your phone, tap once, and listen.
        </p>
      </section>

      <section className="how" aria-label="How it works">
        <ol className="steps">
          <li className="steps__item">
            <Icon name="camera" />
            <span>
              <strong>Point</strong> the camera at a scene, sign, label or page.
            </span>
          </li>
          <li className="steps__item">
            <Icon name="eye" />
            <span>
              <strong>Tap</strong> Describe for the scene, or Read text for words.
            </span>
          </li>
          <li className="steps__item">
            <Icon name="sound" />
            <span>
              <strong>Listen</strong> as the answer is spoken while it is generated.
            </span>
          </li>
        </ol>
        <Notice tone="info" title="Private by design">
          Camera frames are processed on this device and are never uploaded. After setup, SightEcho
          works without an internet connection.
        </Notice>
      </section>

      <section
        className="card"
        aria-labelledby="setup-title"
        aria-busy={state.status === 'checking' || state.status === 'starting'}
      >
        <h2 id="setup-title" className="card__title">
          {state.status === 'unsupported' ? 'This browser can’t run SightEcho' : 'One-time setup'}
        </h2>
        <SetupBody {...props} />
      </section>
    </div>
  );
}

function SetupBody({
  state,
  capabilities,
  persistent,
  defaultModelUrl,
  onFile,
  onUrl,
  onCancel,
}: SetupScreenProps) {
  switch (state.status) {
    case 'checking':
      return (
        <p className="row">
          <Spinner label="Checking" /> Checking what this device supports…
        </p>
      );

    case 'unsupported':
      return (
        <>
          <ul className="problem-list">
            {state.problems.map((problem) => (
              <li key={problem}>{PROBLEM_TEXT[problem]}</li>
            ))}
          </ul>
          <p className="muted">
            The model runs on your device’s graphics chip through WebGPU, so SightEcho needs a
            browser that supports it.
          </p>
        </>
      );

    case 'installing': {
      const fraction = installFraction(state);
      return (
        <div className="stack">
          <p>
            Saving <strong>{state.name}</strong> to this device so it works offline next time.
          </p>
          <ProgressBar value={fraction} label="Saving model" />
          <p className="row row--between muted">
            <span aria-live="polite">
              {formatBytes(state.received)}
              {state.total ? ` of ${formatBytes(state.total)}` : ''}
            </span>
            <button type="button" className="button button--ghost" onClick={onCancel}>
              Cancel
            </button>
          </p>
        </div>
      );
    }

    case 'starting':
      return (
        <div className="stack">
          <p className="row">
            <Spinner label="Starting" /> Starting <strong>{state.name}</strong>…
          </p>
          <ProgressBar value={undefined} label="Starting model" />
          <p className="muted">
            The model is being loaded onto your device’s graphics chip. This can take a while,
            especially the first time.
          </p>
        </div>
      );

    case 'needs-model':
    case 'ready':
      return (
        <ModelPicker
          error={state.status === 'needs-model' ? state.error : undefined}
          capabilities={capabilities}
          persistent={persistent}
          defaultModelUrl={defaultModelUrl}
          onFile={onFile}
          onUrl={onUrl}
        />
      );
  }
}

function ModelPicker({
  error,
  capabilities,
  persistent,
  defaultModelUrl,
  onFile,
  onUrl,
}: {
  error: string | undefined;
  capabilities: Capabilities | null;
  persistent: boolean;
  defaultModelUrl: string;
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
}) {
  const fileId = useId();
  const urlId = useId();
  const [url, setUrl] = useState(defaultModelUrl);
  const [urlError, setUrlError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
        throw new Error('insecure');
      }
      setUrlError(null);
      onUrl(parsed.href);
    } catch {
      setUrlError('Enter a full https:// address to a .task or .litertlm model file.');
    }
  };

  return (
    <div className="stack">
      {error && (
        <Notice tone="error" title="The model could not be started">
          {error}
        </Notice>
      )}
      <p>
        SightEcho needs a Gemma vision model, a single file of a few gigabytes. You add it once; it
        is {persistent ? 'kept on this device' : 'loaded for this visit'} and never leaves it.
      </p>

      {capabilities && !capabilities.storage && (
        <Notice tone="warning">{PROBLEM_TEXT.storage}</Notice>
      )}
      {capabilities && !capabilities.speech && (
        <Notice tone="warning">{PROBLEM_TEXT.speech}</Notice>
      )}

      <div>
        <input
          id={fileId}
          className="visually-hidden"
          type="file"
          accept={MODEL_ACCEPT}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onFile(file);
          }}
        />
        <label htmlFor={fileId} className="button button--primary button--block">
          <Icon name="upload" />
          Choose model file
        </label>
      </div>

      <div className="divider" role="separator">
        <span>or download it</span>
      </div>

      <form className="stack stack--tight" onSubmit={submit} noValidate>
        <label htmlFor={urlId} className="field-label">
          Model address
        </label>
        <div className="input-row">
          <input
            id={urlId}
            className="input"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…/gemma-4-E2B-it-web.task"
            value={url}
            aria-invalid={urlError !== null}
            aria-describedby={urlError ? `${urlId}-error` : undefined}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" className="button button--secondary">
            <Icon name="download" />
            Download
          </button>
        </div>
        {urlError && (
          <p id={`${urlId}-error`} className="field-error">
            {urlError}
          </p>
        )}
      </form>

      <details className="details">
        <summary>Where do I get a model?</summary>
        <p>
          Download one of these browser-ready files on a computer or phone, then choose it above.
          Gemma models are published by Google under the Gemma terms of use, which you accept on the
          download page.
        </p>
        <ul className="link-list">
          {MODEL_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.name}
              </a>{' '}
              <span className="muted">— {link.note}</span>
            </li>
          ))}
        </ul>
        <p className="muted">
          Only files built for the web (names ending in <code>-web.task</code> or{' '}
          <code>-Web.litertlm</code>) work in the browser.
        </p>
      </details>
    </div>
  );
}
