import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import UserThemeProvider from './UserThemeProvider';
import { supabase } from '../utils/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboardingChecked(true);
      return;
    }

    // First, check localStorage for a fast path
    const localFlag = localStorage.getItem('hasCompletedOnboarding');
    if (localFlag === 'true') {
      setHasStore(true);
      setOnboardingChecked(true);
      return;
    }

    // Otherwise, query Supabase (handles Google OAuth returning users)
    const checkStore = async () => {
      try {
        const { data: stores, error } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!error && stores && stores.length > 0) {
          localStorage.setItem('active_store_id', stores[0].id);
          localStorage.setItem('hasCompletedOnboarding', 'true');
          setHasStore(true);
        } else {
          setHasStore(false);
        }
      } catch {
        setHasStore(false);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkStore();
  }, [user]);

  if (loading || !onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF0000] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect new users to setup 
  const currentPath = window.location.pathname;
  if (hasStore === false && currentPath !== '/setup-shop') {
    return <Navigate to="/setup-shop" replace />;
  }

  return (
    <UserThemeProvider>
      {children}
    </UserThemeProvider>
  );
}