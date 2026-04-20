import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWA_INSTALL_DISMISS_UNTIL_KEY = 'nobaranime_pwa_install_dismiss_until';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const isInstalledRef = useRef(false);
  const isPromptDismissedRef = useRef(false);

  const clearDismissState = () => {
    if (typeof window === 'undefined') return;
    isPromptDismissedRef.current = false;
    window.localStorage.removeItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
  };

  const dismissPrompt = (dismissForHours: number) => {
    if (typeof window === 'undefined') return;
    const dismissUntil = Date.now() + dismissForHours * 60 * 60 * 1000;
    isPromptDismissedRef.current = true;
    setIsInstallable(false);
    window.localStorage.setItem(PWA_INSTALL_DISMISS_UNTIL_KEY, String(dismissUntil));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawDismissUntil = window.localStorage.getItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
    if (rawDismissUntil) {
      const dismissUntil = Number(rawDismissUntil);
      if (!Number.isNaN(dismissUntil) && dismissUntil > Date.now()) {
        isPromptDismissedRef.current = true;
      } else {
        window.localStorage.removeItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      if (!isPromptDismissedRef.current && !isInstalledRef.current) {
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      clearDismissState();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Separate effect for checking install status to avoid cascading renders
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalledRef.current = true;
      requestAnimationFrame(() => {
        setIsInstalled(true);
      });
    }
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        clearDismissState();
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Error during install prompt:', error);
    }
  };

  return {
    isInstallable,
    isInstalled,
    install,
    dismissPrompt,
  };
}
