import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TutorialProvider } from '@shared/contexts/TutorialContext';
import { runMigrations } from '@shared/utils/saveProgress';
import './index.css';

runMigrations();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TutorialProvider>
      <App />
    </TutorialProvider>
  </React.StrictMode>
);
