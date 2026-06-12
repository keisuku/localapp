import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { initNavSync } from '@/core/store/nav';
import { initPrefs } from '@/core/store/prefs';

initNavSync();
void initPrefs();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
