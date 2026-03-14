import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { Loader2 } from "lucide-react";

// Lazy load pages for performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const HomeRoute = lazy(() => import("./pages/HomeRoute"));
const SetupShop = lazy(() => import("./pages/SetupShop"));
const BrandingSettings = lazy(() => import("./pages/BrandingSettings"));
const Invoices = lazy(() => import("./pages/Invoices"));
const CreateInvoice = lazy(() => import("./pages/CreateInvoice"));
const InvoicePreview = lazy(() => import("./pages/InvoicePreview"));
const Customers = lazy(() => import("./pages/Customers"));
const Products = lazy(() => import("./pages/Products"));
const StressTest = lazy(() => import("./pages/StressTest"));

const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
    <p className="text-slate-600 font-medium animate-pulse">Loading your dashboard...</p>
  </div>
);

import MobileNav from "./components/MobileNav";

const AppLayout = () => (
  <div className="min-h-screen bg-slate-50">
    <Suspense fallback={<LoadingFallback />}>
      <Outlet />
    </Suspense>
    <MobileNav />
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicRoute>
        <Suspense fallback={<LoadingFallback />}>
          <LandingPage />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Suspense fallback={<LoadingFallback />}>
          <Login />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Suspense fallback={<LoadingFallback />}>
          <Register />
        </Suspense>
      </PublicRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
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
        path: "/branding",
        element: <BrandingSettings />,
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
]);
