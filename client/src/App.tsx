import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import WhatsAppButton from "./components/WhatsAppButton";
import { ToastProvider } from "./components/Toast";
import Home from "./pages/Home";
import Checkout from "./pages/Checkout";
import { AdminRoutes } from "./pages/admin/AdminRoutes";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/admin/*" element={<AdminRoutes />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
        <CartDrawer />
        <WhatsAppButton />
        <Footer />
      </div>
    </ToastProvider>
  );
}

