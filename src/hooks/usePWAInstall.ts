import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWA_INSTALL_DISMISS_UNTIL_KEY = 'nobaranime_pwa_install_dismiss_until';
const PWA_INSTALL_PERMANENT_KEY = 'nobaranime_pwa_install_permanent_dismiss';

// Check localStorage for initial dismiss state (safe to do in function body)
function getInitialDismissState(): { isDismissed: boolean } {
  if (typeof window === 'undefined') return { isDismissed: false };

  // Check permanent dismiss
  if (window.localStorage.getItem(PWA_INSTALL_PERMANENT_KEY)) {
    return { isDismissed: true };
  }

  // Check temporary dismiss
  const rawDismissUntil = window.localStorage.getItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
  if (rawDismissUntil) {
    const dismissUntil = Number(rawDismissUntil);
    if (!Number.isNaN(dismissUntil) && dismissUntil > Date.now()) {
      return { isDismissed: true };
    }
    window.localStorage.removeItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
  }

  return { isDismissed: false };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const initialState = getInitialDismissState();
  const [isInstallable, setIsInstallable] = useState(!initialState.isDismissed);
  const [isInstalled, setIsInstalled] = useState(false);
  const isInstalledRef = useRef(false);
  const isPromptDismissedRef = useRef(initialState.isDismissed);

  const clearDismissState = () => {
    if (typeof window === 'undefined') return;
    isPromptDismissedRef.current = false;
    window.localStorage.removeItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
    window.localStorage.removeItem(PWA_INSTALL_PERMANENT_KEY);
  };

  const dismissPrompt = (dismissForHours: number, permanent = false) => {
    if (typeof window === 'undefined') return;
    if (permanent) {
      isPromptDismissedRef.current = true;
      window.localStorage.setItem(PWA_INSTALL_PERMANENT_KEY, '1');
      window.localStorage.removeItem(PWA_INSTALL_DISMISS_UNTIL_KEY);
      // Force hide - set immediately in component
      window.requestAnimationFrame(() => {
        setIsInstallable(false);
      });
      return;
    }
    const dismissUntil = Date.now() + dismissForHours * 60 * 60 * 1000;
    isPromptDismissedRef.current = true;
    window.localStorage.setItem(PWA_INSTALL_DISMISS_UNTIL_KEY, String(dismissUntil));
    window.requestAnimationFrame(() => {
      setIsInstallable(false);
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial state already handled by getInitialDismissState()
    // Only need to listen for future events

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
