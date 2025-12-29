import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { store } from './store/auth';
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Bookings from "./pages/Bookings";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import CalendarPage from "./pages/Calendar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardSelection from "./pages/DashboardSelection";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDriverRegistration from "./pages/AdminDriverRegistration";
import AdminDriverManagement from "./pages/AdminDriverManagement";
import AdminCustomerRegistration from "./pages/AdminCustomerRegistration";
import AdminCustomerManagement from "./pages/AdminCustomerManagement";
import AdminVehicleRegistration from "./pages/AdminVehicleRegistration";
import AdminVehicleManagement from "./pages/AdminVehicleManagement";
import DriverDashboard from "./pages/DriverDashboard";
import { AdminRoute, DriverRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<AdminRoute><DashboardSelection /></AdminRoute>} />
              <Route path="/bookings" element={<AdminRoute><Bookings /></AdminRoute>} />
              <Route path="/invoices" element={<AdminRoute><Invoices /></AdminRoute>} />
              <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="/calendar" element={<AdminRoute><CalendarPage /></AdminRoute>} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/main-dashboard" element={<AdminRoute><Index /></AdminRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/drivers" element={<AdminRoute><AdminDriverRegistration /></AdminRoute>} />
            <Route path="/admin/drivers/manage" element={<AdminRoute><AdminDriverManagement /></AdminRoute>} />
            <Route path="/admin/customers" element={<AdminRoute><AdminCustomerRegistration /></AdminRoute>} />
            <Route path="/admin/customers/manage" element={<AdminRoute><AdminCustomerManagement /></AdminRoute>} />
            <Route path="/admin/vehicles/register" element={<AdminRoute><AdminVehicleRegistration /></AdminRoute>} />
            <Route path="/admin/vehicles/manage" element={<AdminRoute><AdminVehicleManagement /></AdminRoute>} />
            <Route path="/driver" element={<DriverRoute><DriverDashboard /></DriverRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Provider>
);

createRoot(document.getElementById("root")!).render(<App />);
