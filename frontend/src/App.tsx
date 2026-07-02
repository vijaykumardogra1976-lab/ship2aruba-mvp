import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/shared/AppLayout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { OrderWizard } from "@/features/order-wizard/components/OrderWizard";
import { OrdersViewerPage } from "@/features/orders-viewer/components/OrdersViewerPage";
import { ItemsControlPanel } from "@/features/orders-viewer/components/ItemsControlPanel";

// Client imports
import { ClientAuthProvider } from "@/features/client-auth/hooks/useClientAuth";
import { ClientLoginPage } from "@/features/client-auth/components/ClientLoginPage";
import { ClientOtpPage } from "@/features/client-auth/components/ClientOtpPage";
import { ClientSetPasswordPage } from "@/features/client-auth/components/ClientSetPasswordPage";
import { ClientLayout } from "@/features/client-portal/components/ClientLayout";
import { ClientDashboardPage } from "@/features/client-portal/components/ClientDashboardPage";
import { ClientOrdersPage } from "@/features/client-portal/components/ClientOrdersPage";
import { ClientOrderDetailPage } from "@/features/client-portal/components/ClientOrderDetailPage";
import { ClientPaymentsPage } from "@/features/client-portal/components/ClientPaymentsPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* ─── STAFF PORTAL ─── */}
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/orders/new" replace />} />
          <Route path="orders/new" element={<OrderWizard />} />
          <Route path="orders" element={<OrdersViewerPage />} />
          <Route path="orders/:orderId/items" element={<ItemsControlPanel />} />
        </Route>
      </Route>

      {/* ─── CLIENT PORTAL ─── */}
      <Route
        path="/client/*"
        element={
          <ClientAuthProvider>
            <Routes>
              {/* Auth */}
              <Route path="login" element={<ClientLoginPage />} />
              <Route path="otp" element={<ClientOtpPage />} />
              <Route path="set-password" element={<ClientSetPasswordPage />} />
              {/* Protected portal */}
              <Route element={<ClientLayout />}>
                <Route path="dashboard" element={<ClientDashboardPage />} />
                <Route path="orders" element={<ClientOrdersPage />} />
                <Route path="orders/:id" element={<ClientOrderDetailPage />} />
                <Route path="payments" element={<ClientPaymentsPage />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>
            </Routes>
          </ClientAuthProvider>
        }
      />

      <Route path="*" element={<Navigate to="/orders/new" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

