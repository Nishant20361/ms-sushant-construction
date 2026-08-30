import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import WhatsAppButton from "./components/WhatsAppButton";
import { ToastProvider } from "./components/Toast";
import { LoadingState } from "./components/Loading";
import Home from "./pages/Home";
import Checkout from "./pages/Checkout";

const AdminRoutes = lazy(() =>
  import("./pages/admin/AdminRoutes").then((m) => ({ default: m.AdminRoutes }))
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <ToastProvider>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col">
        {!isAdmin && <Navbar />}
        <div className="flex-1">
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <LoadingState label="Loading…" />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </div>
        {!isAdmin && <CartDrawer />}
        {!isAdmin && <WhatsAppButton />}
        {!isAdmin && <Footer />}
      </div>
    </ToastProvider>
  );
}
