import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute: Wraps public-only pages (/, /login, /register).
 * If the user is already authenticated, they are redirected to /dashboard.
 * This ensures logged-in users always stay in the app and never see the landing page.
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Stamping your session..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
