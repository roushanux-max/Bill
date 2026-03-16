import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import LoadingScreen from "./components/LoadingScreen";
import { useEffect } from "react";
import { useLocation, ScrollRestoration } from "react-router-dom";
import { lazyWithRetry, clearLazyRetryFlag } from "./utils/lazyRetry";

// Lazy load pages for performance
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const HomeRoute = lazyWithRetry(() => import("./pages/HomeRoute"));
const SetupShop = lazyWithRetry(() => import("./pages/SetupShop"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Invoices = lazyWithRetry(() => import("./pages/Invoices"));
const CreateInvoice = lazyWithRetry(() => import("./pages/CreateInvoice"));
const InvoicePreview = lazyWithRetry(() => import("./pages/InvoicePreview"));
const Customers = lazyWithRetry(() => import("./pages/Customers"));
const Products = lazyWithRetry(() => import("./pages/Products"));
const StressTest = lazyWithRetry(() => import("./pages/StressTest"));

const LoadingFallback = () => <LoadingScreen />;

import MobileNav from "./components/MobileNav";
import Header from "./components/Header";
import ErrorPage from "./pages/ErrorPage";

const RootLayout = () => {
  useEffect(() => {
    clearLazyRetryFlag();
  }, []);

  return (
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
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: (
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        ),
      },
      {
        path: "/login",
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: "/register",
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "/dashboard",
            element: <HomeRoute />,
          },
          {
            path: "/setup-shop",
            element: <SetupShop />,
          },
          {
            path: "/stress-test",
            element: <StressTest />,
          },
          {
            path: "/settings",
            element: <Settings />,
          },
          {
            path: "/invoice-preview",
            element: <InvoicePreview />,
          },
          {
            path: "/create-invoice",
            element: <CreateInvoice />,
          },
          {
            path: "/edit-invoice/:id",
            element: <CreateInvoice />,
          },
          {
            path: "/invoices",
            element: <Invoices />,
          },
          {
            path: "/customers",
            element: <Customers />,
          },
          {
            path: "/products",
            element: <Products />,
          },
        ],
      },
    ],
  },
]);
