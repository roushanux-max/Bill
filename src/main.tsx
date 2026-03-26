import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from "@vercel/analytics/react"
import App from './app/App';
import './styles/index.css';
import './styles/print-friendly.css';

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ PWA Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ PWA Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
);
