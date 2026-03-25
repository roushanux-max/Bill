import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { safeGet, safeSet, safeRemove } from '@/shared/utils/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before
    const dismissed = safeGet('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days after dismissal
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      safeRemove('pwa-install-dismissed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    safeSet('pwa-install-dismissed', new Date().toISOString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-primary p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Smartphone className="size-6 text-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Install Invoice
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Install our app for quick access, offline use, and a better experience!
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="bg-primary hover:bg-primary/90 text-white flex-1"
                size="sm"
              >
                <Download className="size-4 mr-2" />
                Install App
              </Button>

              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
            Works offline • No app store needed • Free forever
          </div>
        </div>
      </div>
    </div>
  );
}

// iOS Install Instructions Component
export function IOSInstallInstructions() {
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isInstalled) {
      // Show instructions after 1 minute for iOS users
      setTimeout(() => {
        const dismissed = safeGet('ios-install-dismissed');
        if (!dismissed) {
          setShowInstructions(true);
        }
      }, 60000);
    }
  }, []);

  const handleDismiss = () => {
    setShowInstructions(false);
    safeSet('ios-install-dismissed', 'true');
  };

  if (!showInstructions) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-10">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="size-5" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-3">
            <Smartphone className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Install Invoice on iOS</h2>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-semibold text-gray-900">Tap the Share button</p>
              <p className="text-gray-600">Look for the share icon in Safari's toolbar</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-semibold text-gray-900">Scroll and tap "Add to Home Screen"</p>
              <p className="text-gray-600">You'll see the Invoice icon and name</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="font-semibold text-gray-900">Tap "Add"</p>
              <p className="text-gray-600">Invoice will appear on your home screen!</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleDismiss}
          className="w-full mt-6 bg-primary hover:bg-primary/90"
        >
          Got it!
        </Button>
      </div>
    </div>
  );
}
