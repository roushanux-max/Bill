import { createBrowserRouter, Outlet } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import HomeRoute from "./pages/HomeRoute";
import BrandingSettings from "./pages/BrandingSettings";
import InvoicePreview from "./pages/InvoicePreview";
import CreateInvoice from "./pages/CreateInvoice";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Invoices from "./pages/Invoices";
import SetupShop from "./pages/SetupShop";
import StressTest from "./pages/StressTest";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/",
    element: <ProtectedRoute><Outlet /></ProtectedRoute>,
    children: [
      {
        path: "/dashboard",
        Component: HomeRoute,
      },
      {
        path: "/setup-shop",
        Component: SetupShop,
      },
      {
        path: "/stress-test",
        Component: StressTest,
      },
      {
        path: "/branding",
        Component: BrandingSettings,
      },
      {
        path: "/invoice-preview",
        Component: InvoicePreview,
      },
      {
        path: "/create-invoice",
        Component: CreateInvoice,
      },
      {
        path: "/edit-invoice/:id",
        Component: CreateInvoice,
      },
      {
        path: "/invoices",
        Component: Invoices,
      },
      {
        path: "/customers",
        Component: Customers,
      },
      {
        path: "/products",
        Component: Products,
      },
    ]
  }
]);
