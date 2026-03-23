import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import LoadingScreen from '@/shared/components/LoadingScreen';
import UserThemeProvider from './UserThemeProvider';
import { supabase } from '@/shared/utils/supabase';
import { isGuestMode } from '@/shared/utils/storage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, hasStore, isAdmin } = useAuth();
  const location = useLocation();
  const isGuest = isGuestMode();

  if (loading || (user && hasStore === null)) {
    return <LoadingScreen message="Verifying security..." />;
  }

  if (!user && !isGuest) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard normally
  if (!isGuest && hasStore === false && location.pathname === '/setup-shop') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UserThemeProvider>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1">
          {children}
        </div>
      </div>
    </UserThemeProvider>
  );
}