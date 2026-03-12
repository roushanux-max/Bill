import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B1A1A] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has completed onboarding
  const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
  const currentPath = window.location.pathname;

  if (!hasCompletedOnboarding && currentPath !== '/setup-shop') {
    return <Navigate to="/setup-shop" replace />;
  }

  return <>{children}</>;
}