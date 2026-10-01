import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { config } from './config';
import { detectCapabilities } from './lib/capabilities';
import { createMediapipeDescriber } from './services/mediapipeDescriber';
import { createOpfsModelStore } from './services/modelStore';
import { registerServiceWorker } from './services/serviceWorker';
import { ServicesContext, type Services } from './services/services';
import { createBrowserSpeaker } from './services/speaker';
import './styles/index.css';

const services: Services = {
  detectCapabilities: () => detectCapabilities(),
  createDescriber: createMediapipeDescriber,
  modelStore: typeof navigator.storage?.getDirectory === 'function' ? createOpfsModelStore() : null,
  speaker: createBrowserSpeaker(),
  defaultModelUrl: config.defaultModelUrl,
};

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element.');

createRoot(root).render(
  <StrictMode>
    <ServicesContext.Provider value={services}>
      <App />
    </ServicesContext.Provider>
  </StrictMode>,
);

if (import.meta.env.PROD) registerServiceWorker();
