import { useEffect, useId, useRef } from 'react';
import { formatBytes } from '../lib/format';
import { LANGUAGES, findLanguage } from '../lib/languages';
import { RATE_MAX, RATE_MIN, type Settings } from '../lib/settings';
import { useServices } from '../services/services';
import { Icon } from './Icon';
import { Notice } from './Notice';

interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  modelName: string | null;
  modelSize: number | null;
  onChange: (patch: Partial<Settings>) => void;
  onRemoveModel: () => void;
  onClose: () => void;
}

const SAMPLE = 'This is how answers will sound.';

export function SettingsDialog({
  open,
  settings,
  modelName,
  modelSize,
  onChange,
  onRemoveModel,
  onClose,
}: SettingsDialogProps) {
  const { speaker } = useServices();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const language = findLanguage(settings.language);
  const missingVoice = speaker.available && !speaker.hasVoiceFor(settings.language);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="dialog__header">
        <h2 id={`${id}-title`} className="dialog__title">
          Settings
        </h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
          <Icon name="close" />
        </button>
      </div>

      <div className="dialog__body">
        <div className="field">
          <label htmlFor={`${id}-language`} className="field-label">
            Answer language
          </label>
          <select
            id={`${id}-language`}
            className="input"
            value={settings.language}
            onChange={(event) => onChange({ language: event.target.value })}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} lang={lang.code}>
                {lang.nativeName === lang.name ? lang.name : `${lang.nativeName} — ${lang.name}`}
              </option>
            ))}
          </select>
          {missingVoice && (
            <Notice tone="warning">
              No {language?.name ?? 'matching'} voice is installed on this device, so answers may be
              read with the wrong accent or not at all. You can add voices in your device’s
              text-to-speech settings.
            </Notice>
          )}
        </div>

        <fieldset className="field">
          <legend className="field-label">Level of detail</legend>
          <div className="segmented">
            {(['brief', 'detailed'] as const).map((detail) => (
              <label key={detail} className="segmented__option">
                <input
                  type="radio"
                  name={`${id}-detail`}
                  value={detail}
                  checked={settings.detail === detail}
                  onChange={() => onChange({ detail })}
                />
                <span>{detail === 'brief' ? 'Brief' : 'Detailed'}</span>
              </label>
            ))}
          </div>
          <p className="field-hint">Brief answers are faster. Detailed answers cover more.</p>
        </fieldset>

        <div className="field">
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={settings.speak}
              onChange={(event) => onChange({ speak: event.target.checked })}
            />
            <span className="switch__track" aria-hidden="true" />
            <span>Read answers aloud</span>
          </label>
          <p className="field-hint">
            Turn this off if you use a screen reader such as TalkBack or VoiceOver; it will read the
            answers instead.
          </p>
        </div>

        <div className="field">
          <label htmlFor={`${id}-rate`} className="field-label">
            Speaking speed <span className="muted">({settings.rate.toFixed(1)}×)</span>
          </label>
          <div className="input-row">
            <input
              id={`${id}-rate`}
              type="range"
              className="range"
              min={RATE_MIN}
              max={RATE_MAX}
              step={0.1}
              value={settings.rate}
              disabled={!settings.speak}
              onChange={(event) => onChange({ rate: Number(event.target.value) })}
            />
            <button
              type="button"
              className="button button--secondary"
              disabled={!settings.speak || !speaker.available}
              onClick={() => {
                speaker.cancel();
                speaker.speak(SAMPLE, {
                  lang: language?.code ?? settings.language,
                  rate: settings.rate,
                });
              }}
            >
              <Icon name="sound" />
              Test
            </button>
          </div>
        </div>

        <div className="field field--separated">
          <p className="field-label">Model on this device</p>
          <p>
            {modelName ?? 'None'}
            {modelSize ? <span className="muted"> · {formatBytes(modelSize)}</span> : null}
          </p>
          <button
            type="button"
            className="button button--ghost-danger"
            onClick={() => {
              if (
                window.confirm('Remove the model from this device? You will need to add it again.')
              ) {
                onRemoveModel();
              }
            }}
          >
            Remove model
          </button>
        </div>
      </div>
    </dialog>
  );
}
