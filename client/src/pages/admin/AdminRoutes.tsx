import { Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./AdminAuthContext";
import AdminLogin from "./AdminLogin";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import AdminLayout from "./AdminLayout";
import { LoadingState } from "../../components/Loading";
import Dashboard from "./Dashboard";
import AdminProducts from "./AdminProducts";
import AdminCategories from "./AdminCategories";
import AdminOrders from "./AdminOrders";
import AdminSettings from "./AdminSettings";
import ChangePassword from "./ChangePassword";
import AdminBilling from "./AdminBilling";
import AdminDues from "./AdminDues";
import ReceivePayment from "./ReceivePayment";

function Protected() {
  const { user, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <LoadingState label="Checking session…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return <AdminLayout />;
}

export function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route element={<Protected />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="billing" element={<AdminBilling />} />
          <Route path="payments/receive/:orderId" element={<ReceivePayment />} />
          <Route path="dues" element={<AdminDues />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
