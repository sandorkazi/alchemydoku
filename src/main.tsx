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
