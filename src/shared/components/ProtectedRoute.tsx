import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import LoadingScreen from '@/shared/components/LoadingScreen';
import UserThemeProvider from './UserThemeProvider';
import { supabase } from '@/shared/utils/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, hasStore, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || (user && hasStore === null)) {
    return <LoadingScreen message="Verifying security..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect new users to setup, but NOT if already there, and NOT if they are an admin
  if (hasStore === false && location.pathname !== '/setup-shop' && !isAdmin) {
    return <Navigate to="/setup-shop" replace />;
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