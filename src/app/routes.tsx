import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import LoadingScreen from "./components/LoadingScreen";

// Lazy load pages for performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const HomeRoute = lazy(() => import("./pages/HomeRoute"));
const SetupShop = lazy(() => import("./pages/SetupShop"));
const Settings = lazy(() => import("./pages/Settings"));
const Invoices = lazy(() => import("./pages/Invoices"));
const CreateInvoice = lazy(() => import("./pages/CreateInvoice"));
const InvoicePreview = lazy(() => import("./pages/InvoicePreview"));
const Customers = lazy(() => import("./pages/Customers"));
const Products = lazy(() => import("./pages/Products"));
const StressTest = lazy(() => import("./pages/StressTest"));

const LoadingFallback = () => <LoadingScreen />;

import MobileNav from "./components/MobileNav";

const AppLayout = () => (
  <div className="min-h-screen flex flex-col bg-slate-50 user-theme">
    <Suspense fallback={<LoadingFallback />}>
      <div className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </div>
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
]);
