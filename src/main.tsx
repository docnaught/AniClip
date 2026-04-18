/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Initialize the PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    console.log("PWA needs refresh");
  },
  onOfflineReady() {
    console.log("PWA ready for offline use");
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
