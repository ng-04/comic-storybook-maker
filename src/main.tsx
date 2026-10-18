import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled (same origin), so PDF export can embed them.
import '@fontsource/bangers/400.css';
import '@fontsource/comic-neue/400.css';
import '@fontsource/comic-neue/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
