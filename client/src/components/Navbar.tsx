import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useSettings } from "../context/SettingsContext";
import { resolveImageUrl } from "../lib/format";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#categories", label: "Categories" },
  { href: "#products", label: "Products" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count, openCart } = useCart();
  const { settings } = useSettings();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  const companyName = settings?.companyName || "M/S SUSHANT CONSTRUCTION";
  const logo = settings?.logoUrl;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          {logo ? (
            <img
              src={resolveImageUrl(logo) ?? ""}
              alt={companyName}
              className="h-10 w-10 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-xl font-bold text-white">
              M
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-900 sm:text-base">
              {companyName}
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              {settings?.tagline || "Trusted construction material supplier"}
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {!isAdmin &&
            NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-700 transition hover:text-brand-600"
              >
                {l.label}
              </a>
            ))}
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-slate-700 hover:text-brand-600">
              Admin Home
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label={`Open cart (${count} items)`}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4h11.5a1 1 0 00.9-1.4L17 13m-10 0h10M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-page flex flex-col py-3">
            {!isAdmin &&
              NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600"
                >
                  {l.label}
                </a>
              ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Admin Home
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

