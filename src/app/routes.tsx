import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import PublicRoute from '@/shared/components/PublicRoute';
import LoadingScreen from '@/shared/components/LoadingScreen';
import { useEffect } from 'react';
import { useLocation, ScrollRestoration } from 'react-router-dom';
import { lazyWithRetry, clearLazyRetryFlag } from '@/shared/utils/lazyRetry';

// Lazy load pages for performance
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const HomeRoute = lazyWithRetry(() => import('./pages/HomeRoute'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Invoices = lazyWithRetry(() => import('@/features/invoices/pages/Invoices'));
const CreateInvoice = lazyWithRetry(() => import('@/features/invoices/pages/CreateInvoice'));
const InvoicePreview = lazyWithRetry(() => import('@/features/invoices/pages/InvoicePreview'));
const Customers = lazyWithRetry(() => import('@/features/customers/pages/Customers'));
const Products = lazyWithRetry(() => import('@/features/products/pages/Products'));
const StressTest = lazyWithRetry(() => import('./pages/StressTest'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));

const LoadingFallback = () => <LoadingScreen />;

import MobileNav from '@/shared/components/MobileNav';
import Header from '@/shared/components/Header';
import ErrorPage from './pages/ErrorPage';
import { NavigationProvider } from '@/shared/contexts/NavigationContext';

const RootLayout = () => {
  useEffect(() => {
    clearLazyRetryFlag();
  }, []);

  return (
    <NavigationProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 user-theme">
        <ScrollRestoration />
        <Header />
        <Suspense fallback={<LoadingFallback />}>
          <div className="flex-1 pb-24 md:pb-0">
            <Outlet />
          </div>
        </Suspense>
        <MobileNav />
      </div>
    </NavigationProvider>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: (
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        ),
      },
      {
        path: '/login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: '/register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/dashboard',
            element: <HomeRoute />,
          },
          {
            path: '/stress-test',
            element: <StressTest />,
          },
          {
            path: '/settings',
            element: <Settings />,
          },
          {
            path: '/invoice-preview',
            element: <InvoicePreview />,
          },
          {
            path: '/create-invoice',
            element: <CreateInvoice />,
          },
          {
            path: '/edit-invoice/:id',
            element: <CreateInvoice />,
          },
          {
            path: '/invoices',
            element: <Invoices />,
          },
          {
            path: '/customers',
            element: <Customers />,
          },
          {
            path: '/products',
            element: <Products />,
          },
          {
            path: '/admin',
            element: <AdminDashboard />,
          },
        ],
      },
    ],
  },
]);
