import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initPWA() {
  if (typeof window === 'undefined') return;

  // Register service worker if supported
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  window.dispatchEvent(new CustomEvent('almostmine_sw_updated'));
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('Service worker registration failed or unsupported in this container:', err);
        });
    });
  }

  // Capture Android beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('almostmine_install_available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('almostmine_installed'));
  });
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      setIsStandalone(standalone);
    };

    checkStandalone();

    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (deferredPrompt) {
      setCanInstall(true);
    }

    const handleAvailable = () => setCanInstall(true);
    const handleInstalled = () => setCanInstall(false);

    window.addEventListener('almostmine_install_available', handleAvailable);
    window.addEventListener('almostmine_installed', handleInstalled);

    return () => {
      window.removeEventListener('almostmine_install_available', handleAvailable);
      window.removeEventListener('almostmine_installed', handleInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    deferredPrompt = null;
  };

  return { canInstall, isStandalone, isIOS, triggerInstall };
}
