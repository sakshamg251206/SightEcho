import { useState } from 'react';
import { CameraScreen } from './components/CameraScreen';
import { Icon } from './components/Icon';
import { Logo } from './components/Logo';
import { SettingsDialog } from './components/SettingsDialog';
import { SetupScreen } from './components/SetupScreen';
import { useModel } from './hooks/useModel';
import { useSettings } from './hooks/useSettings';
import { useServices } from './services/services';

export function App() {
  const { defaultModelUrl } = useServices();
  const model = useModel();
  const [settings, updateSettings] = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ready = model.state.status === 'ready' && model.describer !== null;

  return (
    <div className={`app${ready ? ' app--live' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand">
          <Logo />
          <span className="brand__name">SightEcho</span>
        </div>
        {ready && (
          <button
            type="button"
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Icon name="settings" />
          </button>
        )}
      </header>

      <main id="main" className="app-main">
        {ready && model.describer ? (
          <>
            <h1 className="visually-hidden">SightEcho camera</h1>
            <CameraScreen describer={model.describer} settings={settings} />
          </>
        ) : (
          <SetupScreen
            state={model.state}
            capabilities={model.capabilities}
            persistent={model.persistent}
            defaultModelUrl={defaultModelUrl}
            onFile={(file) => void model.installFromFile(file)}
            onUrl={(url) => void model.installFromUrl(url)}
            onCancel={model.cancelInstall}
          />
        )}
      </main>

      {!ready && (
        <footer className="app-footer">
          <p>
            Open source ·{' '}
            <a href="https://github.com/sakshamg251206/SightEcho" target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </p>
        </footer>
      )}

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        modelName={model.state.status === 'ready' ? model.state.name : null}
        modelSize={model.modelSize}
        onChange={updateSettings}
        onRemoveModel={() => {
          setSettingsOpen(false);
          void model.removeModel();
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
