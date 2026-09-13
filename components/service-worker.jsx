'use client';

import { useEffect } from 'react';

// Registers the PWA service worker (public/sw.js) so Wingman can be installed
// to the home screen. Registration runs after load and fails silently in
// unsupported browsers or insecure contexts.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
