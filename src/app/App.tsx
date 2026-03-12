import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { PWAInstallPrompt, IOSInstallInstructions } from './components/PWAInstallPrompt';
import { AuthProvider } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <RouterProvider router={router} />
        <PWAInstallPrompt />
        <IOSInstallInstructions />
        <Toaster position="top-center" richColors />
      </BrandingProvider>
    </AuthProvider>
  );
}