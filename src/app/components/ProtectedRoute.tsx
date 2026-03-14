import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import UserThemeProvider from './UserThemeProvider';
import { supabase } from '../utils/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, hasStore } = useAuth();
  const location = useLocation();

  if (loading || (user && hasStore === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6366f1] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect new users to setup, but NOT if already there
  if (hasStore === false && location.pathname !== '/setup-shop') {
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