import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TutorialProvider } from '@shared/contexts/TutorialContext';
import { CheatProvider } from '@shared/contexts/CheatContext';
import { runMigrations } from '@shared/utils/saveProgress';
import './index.css';

runMigrations();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CheatProvider>
      <TutorialProvider>
        <App />
      </TutorialProvider>
    </CheatProvider>
  </React.StrictMode>
);

// Offline support: cache the app shell + assets after the first online visit.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('Service worker registration failed', err));
  });
}
