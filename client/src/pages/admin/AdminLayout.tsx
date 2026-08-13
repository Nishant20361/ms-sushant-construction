import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { adminApi } from "../../lib/api";
import type { Notification } from "../../types";
import { formatOrderStatus } from "../../lib/format";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "📊" },
  { to: "/admin/analytics", label: "Analytics", icon: "📈" },
  { to: "/admin/products", label: "Products", icon: "🧱" },
  { to: "/admin/categories", label: "Categories", icon: "🗂️" },
  { to: "/admin/orders", label: "Orders", icon: "📦" },
  { to: "/admin/billing", label: "Billing", icon: "🧾" },
  { to: "/admin/dues", label: "Dues", icon: "💰" },
  { to: "/admin/customer-due-report", label: "Due Report", icon: "📋" },
  { to: "/admin/customer-statement", label: "Statements", icon: "🧾" },
  { to: "/admin/product-history", label: "Product History", icon: "🔍" },
  { to: "/admin/sales-reports", label: "Sales Reports", icon: "📊" },
  { to: "/admin/settings", label: "Settings", icon: "⚙️" },
  { to: "/admin/change-password", label: "Change Password", icon: "🔑" },
];

const REPORT_SUB_LINKS = [
  { to: "/admin/sales-reports", label: "Daily Report", end: true },
  { to: "/admin/sales-reports?mode=weekly", label: "Weekly Report" },
  { to: "/admin/sales-reports?mode=monthly", label: "Monthly Report" },
];

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellRefMobile = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await adminApi.getNotifications(20);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const hitBell = bellRef.current?.contains(e.target as Node);
      const hitBellMobile = bellRefMobile.current?.contains(e.target as Node);
      if (!hitBell && !hitBellMobile) setBellOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) {
      await loadNotifications();
      if (unreadCount > 0) {
        try {
          await adminApi.markAllNotificationsRead();
          setUnreadCount(0);
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
          // ignore
        }
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const NotificationList = () => (
    <div className="max-h-80 overflow-y-auto">
      {notifications.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {notifications.slice(0, 20).map((n) => (
            <li
              key={n.id}
              className={`px-4 py-3 text-sm ${
                n.read ? "text-slate-500" : "bg-brand-50 font-medium text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{n.customerName}</span>
                <span className="badge whitespace-nowrap bg-amber-100 text-amber-700 text-[10px]">
                  {formatOrderStatus(n.status)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {n.orderNumber} &middot;{" "}
                {new Date(n.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">

      {/* SIDEBAR — fixed on mobile, static in-flow on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            M
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Admin Panel</p>
            <p className="text-xs text-slate-400">M/S Sushant Construction</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <div key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/admin"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
              {item.to === "/admin/sales-reports" && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-slate-700 pl-3">
                  {REPORT_SUB_LINKS.map((sub) => (
                    <NavLink
                      key={sub.to}
                      to={sub.to}
                      end={sub.end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `rounded px-2 py-1 text-xs font-medium transition ${
                          isActive
                            ? "bg-brand-600 text-white"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`
                      }
                    >
                      {sub.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-4">
          <p className="mb-2 text-xs text-slate-400">
            Signed in as <span className="font-semibold text-slate-200">{user?.username}</span>
          </p>
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-center text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY — mobile only, shown behind open drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT COLUMN — full width on mobile, fills remainder on desktop */}
      <div className="flex flex-1 flex-col min-w-0 w-full">

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-white md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="rounded-lg bg-slate-800 p-2 text-white hover:bg-slate-700 active:bg-slate-600 focus:outline-none"
              aria-label="Toggle admin menu"
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-600 font-bold text-xs text-white">
                M
              </div>
              <span className="text-sm font-bold tracking-wide">Admin Panel</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={bellRefMobile}>
              <button
                onClick={openBell}
                className="relative rounded-lg p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-xl text-slate-800 z-50">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  </div>
                  <NotificationList />
                  <Link
                    to="/admin/orders"
                    onClick={() => setBellOpen(false)}
                    className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-slate-50"
                  >
                    View all orders
                  </Link>
                </div>
              )}
            </div>
            <Link
              to="/"
              className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Site ↗
            </Link>
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 md:flex">
          <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative" ref={bellRef}>
              <button
                onClick={openBell}
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  </div>
                  <NotificationList />
                  <Link
                    to="/admin/orders"
                    onClick={() => setBellOpen(false)}
                    className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-brand-600 hover:bg-slate-50"
                  >
                    View all orders
                  </Link>
                </div>
              )}
            </div>
            <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
              ← View Website
            </Link>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden p-3 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
