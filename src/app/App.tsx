import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { PWAInstallPrompt, IOSInstallInstructions } from '@/shared/components/PWAInstallPrompt';
import { AuthProvider } from '@/shared/contexts/AuthContext';
import { BrandingProvider } from '@/shared/contexts/BrandingContext';
import { Toaster } from 'sonner';
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import { processSyncQueue } from '@/shared/utils/storage';

export default function App() {
  useEffect(() => {
    // Process any offline changes saved earlier
    processSyncQueue();
    // Re-check automatically when connection returns
    window.addEventListener('online', processSyncQueue);
    return () => window.removeEventListener('online', processSyncQueue);
  }, []);

  return (
    <AuthProvider>
      <BrandingProvider>
        <RouterProvider router={router} />
        <PWAInstallPrompt />
        <IOSInstallInstructions />
        <Toaster position="top-center" richColors />
        <SyncIndicator />
      </BrandingProvider>
    </AuthProvider>
  );
}
