import { createBrowserRouter } from "react-router-dom";
import HomeRoute from "./pages/HomeRoute";
import BrandingSettings from "./pages/BrandingSettings";
import InvoicePreview from "./pages/InvoicePreview";
import CreateInvoice from "./pages/CreateInvoice";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Invoices from "./pages/Invoices";
import SetupShop from "./pages/SetupShop";
import Login from "./pages/Login";
import Register from "./pages/Register";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomeRoute,
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
    path: "/setup-shop",
    Component: SetupShop,
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
]);
