import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { adminApi } from "../../lib/api";
import type { Notification } from "../../types";
import { formatOrderStatus } from "../../lib/format";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  FolderTree,
  ShoppingBag,
  Receipt,
  WalletCards,
  BookOpen,
  FileSpreadsheet,
  FileText,
  History,
  Settings,
  KeyRound,
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  X,
  PlusCircle,
  Clock,
  CheckCircle2,
  Building2,
  ChevronDown,
} from "lucide-react";

interface NavGroup {
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    subLinks?: { to: string; label: string; end?: boolean }[];
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/assistant", label: "Business Saathi", icon: BookOpen, badge: "NEW" },
      { to: "/admin/analytics", label: "Analytics & Trends", icon: BarChart3 },
    ],
  },
  {
    title: "Sales & Invoicing",
    items: [
      { to: "/admin/place-order", label: "+ नया ऑर्डर (Place Order)", icon: PlusCircle, badge: "NEW" },
      { to: "/admin/khatabook", label: "खाताबुक (Khatabook)", icon: BookOpen },
      { to: "/admin/orders", label: "Orders Management", icon: ShoppingBag },
      { to: "/admin/billing", label: "Billing & Invoices", icon: Receipt },
      { to: "/admin/dues", label: "Customer Dues", icon: WalletCards },
      { to: "/admin/customer-due-report", label: "Due Aging Report", icon: FileSpreadsheet },
      { to: "/admin/customer-statement", label: "Customer Statements", icon: FileText },
      {
        to: "/admin/sales-reports",
        label: "Sales Reports",
        icon: BarChart3,
        subLinks: [
          { to: "/admin/sales-reports", label: "Daily Report", end: true },
          { to: "/admin/sales-reports?mode=weekly", label: "Weekly Report" },
          { to: "/admin/sales-reports?mode=monthly", label: "Monthly Report" },
        ],
      },
    ],
  },
  {
    title: "Catalog & Stock",
    items: [
      { to: "/admin/products", label: "Products & Stock", icon: Package },
      { to: "/admin/categories", label: "Categories", icon: FolderTree },
      { to: "/admin/product-history", label: "Stock Logs / History", icon: History },
    ],
  },
  {
    title: "Preferences",
    items: [
      { to: "/admin/settings", label: "Store Settings", icon: Settings },
      { to: "/admin/change-password", label: "Change Password", icon: KeyRound },
    ],
  },
];

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin/assistant": { title: "Business Saathi", subtitle: "Customer udhari and friendly business advice" },
  "/admin": { title: "Executive Dashboard", subtitle: "Overview of sales, inventory & operations" },
  "/admin/khatabook": { title: "खाताबुक व डिजिटल लेजर (Khatabook)", subtitle: "ग्राहक उधारी हिसाब-किताब, पैसा जमा, WhatsApp रिमाइंडर व गोदाम स्टॉक" },
  "/admin/analytics": { title: "Business Analytics", subtitle: "Detailed sales trends & customer insights" },
  "/admin/products": { title: "Product Inventory", subtitle: "Manage catalog, pricing and stock levels" },
  "/admin/categories": { title: "Product Categories", subtitle: "Organize products into categories" },
  "/admin/orders": { title: "Customer Orders", subtitle: "Process, track and manage incoming orders" },
  "/admin/billing": { title: "Invoicing & Billing", subtitle: "Generate bills, apply discounts & print receipts" },
  "/admin/dues": { title: "Customer Dues & Ledger", subtitle: "Track outstanding balances & record payments" },
  "/admin/customer-due-report": { title: "Customer Due Report", subtitle: "Aging and outstanding credit summary" },
  "/admin/customer-statement": { title: "Customer Statements", subtitle: "Download ledger statements and transactions" },
  "/admin/product-history": { title: "Inventory History", subtitle: "Audit log of product stock and price modifications" },
  "/admin/sales-reports": { title: "Sales & Tax Reports", subtitle: "Daily, weekly and monthly revenue reports" },
  "/admin/settings": { title: "Store Settings", subtitle: "Configure store details, contacts and policies" },
  "/admin/change-password": { title: "Account Security", subtitle: "Update your administrator password" },
};

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const bellRefMobile = useRef<HTMLDivElement>(null);

  const currentRouteInfo = ROUTE_TITLES[location.pathname] || {
    title: "Admin Panel",
    subtitle: "M/S Sushant Construction",
  };

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
    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
      {notifications.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-700">All caught up!</p>
          <p className="text-xs text-slate-400">No new notifications.</p>
        </div>
      ) : (
        notifications.slice(0, 20).map((n) => (
          <div
            key={n.id}
            className={`p-3.5 transition hover:bg-slate-50 ${
              n.read ? "bg-white text-slate-600" : "bg-brand-50/60 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{n.customerName}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">#{n.orderNumber}</p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                {formatOrderStatus(n.status)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(n.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50/70 font-sans text-slate-800 antialiased">
      {/* SIDEBAR — Desktop Fixed / Mobile Slide-over */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-200 shadow-2xl transition-transform duration-300 ease-in-out md:static md:z-auto md:w-68 md:translate-x-0 md:shadow-none lg:w-72 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-5 bg-slate-950/40">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white font-black shadow-md shadow-brand-500/20 group-hover:scale-105 transition">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Sushant Admin
                <span className="rounded bg-brand-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-brand-400 border border-brand-500/30">
                  PRO
                </span>
              </p>
              <p className="text-[11px] text-slate-400 truncate">Construction Material Hub</p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menus Grouped by Category */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isSalesReports = item.to === "/admin/sales-reports";

                  return (
                    <div key={item.to} className="space-y-0.5">
                      <NavLink
                        to={item.to}
                        end={item.to === "/admin"}
                        onClick={() => {
                          if (isSalesReports) {
                            setReportsMenuOpen((prev) => !prev);
                          } else {
                            setSidebarOpen(false);
                          }
                        }}
                        className={({ isActive }) =>
                          `group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                            isActive
                              ? "bg-gradient-to-r from-brand-600 to-amber-600 font-semibold text-white shadow-sm shadow-brand-900/30"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`h-4 w-4 shrink-0 transition ${
                                  isActive
                                    ? "text-white"
                                    : "text-slate-400 group-hover:text-amber-400"
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>

                            {item.subLinks && (
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                                  reportsMenuOpen || isActive ? "rotate-180 text-white" : ""
                                }`}
                              />
                            )}
                          </>
                        )}
                      </NavLink>

                      {/* Sub-links for reports */}
                      {item.subLinks && (reportsMenuOpen || location.pathname.startsWith("/admin/sales-reports")) && (
                        <div className="ml-4 pl-3 border-l border-slate-800 space-y-0.5 py-1">
                          {item.subLinks.map((sub) => (
                            <NavLink
                              key={sub.to}
                              to={sub.to}
                              end={sub.end}
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) =>
                                `block rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                  isActive
                                    ? "bg-brand-500/20 text-brand-300 font-semibold"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                }`
                              }
                            >
                              {sub.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer User Profile & Quick Links */}
        <div className="shrink-0 border-t border-slate-800/90 bg-slate-950/40 p-3.5">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-900/80 p-2 border border-slate-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-amber-500 text-xs font-bold text-white uppercase shadow">
              {user?.username?.substring(0, 2) || "AD"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.username || "Admin"}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Logged in & Active
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/80 px-2.5 py-1.5 text-center text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              <span>Live Site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col min-w-0 w-full">
        {/* Mobile Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {currentRouteInfo.title}
              </h1>
              <p className="text-[10px] text-slate-500 truncate">M/S Sushant Construction</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Bill icon */}
            <Link
              to="/admin/billing"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200"
              title="Create Bill"
            >
              <Receipt className="h-4 w-4" />
            </Link>

            {/* Mobile Notification bell */}
            <div className="relative" ref={bellRefMobile}>
              <button
                onClick={openBell}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                    <span className="text-[11px] text-slate-500 font-medium">Recent Updates</span>
                  </div>
                  <NotificationList />
                  <Link
                    to="/admin/orders"
                    onClick={() => setBellOpen(false)}
                    className="block border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-center text-xs font-semibold text-brand-600 hover:bg-slate-100"
                  >
                    View All Orders →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Desktop Header Bar */}
        <header className="hidden h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-8 md:flex shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Admin</span>
              <span className="text-xs text-slate-300">/</span>
              <h1 className="text-base font-bold text-slate-900">{currentRouteInfo.title}</h1>
            </div>
            <p className="text-xs text-slate-500">{currentRouteInfo.subtitle}</p>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Quick Action: New Bill / Invoice */}
            <Link
              to="/admin/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-brand-500/20 hover:from-brand-700 hover:to-amber-700 hover:shadow-md transition active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Bill</span>
            </Link>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={openBell}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-84 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Notifications</p>
                      <p className="text-[11px] text-slate-500">Real-time order alerts</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <NotificationList />
                  <Link
                    to="/admin/orders"
                    onClick={() => setBellOpen(false)}
                    className="block border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-center text-xs font-semibold text-brand-600 hover:bg-slate-100 hover:text-brand-700 transition"
                  >
                    View All Orders in Orders Manager →
                  </Link>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* Quick Live Site Link */}
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <span>Storefront</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
