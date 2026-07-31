import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export default function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();
  const name = settings?.companyName || "M/S SUSHANT CONSTRUCTION";

  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-lg font-bold text-white">{name}</p>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            {settings?.tagline || "Trusted supplier of cement, steel, roofing sheets and construction materials."}
          </p>
          {settings?.aboutContent && (
            <p className="mt-3 line-clamp-3 max-w-md text-sm text-slate-400">{settings.aboutContent}</p>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#home" className="hover:text-brand-400">Home</a></li>
            <li><a href="#products" className="hover:text-brand-400">Products</a></li>
            <li><a href="#categories" className="hover:text-brand-400">Categories</a></li>
            <li><a href="#contact" className="hover:text-brand-400">Contact</a></li>
            <li><Link to="/admin" className="hover:text-brand-400">Admin Panel</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
          <ul className="space-y-2 text-sm">
            {settings?.phone && (
              <li>
                <a href={`tel:${settings.phone}`} className="hover:text-brand-400">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings?.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="hover:text-brand-400">
                  {settings.email}
                </a>
              </li>
            )}
            {settings?.address && <li className="text-slate-400">{settings.address}</li>}
          </ul>
          {(settings?.facebookUrl || settings?.instagramUrl || settings?.youtubeUrl) && (
            <div className="mt-4 flex gap-3">
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-slate-400 hover:text-brand-400">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z"/></svg>
                </a>
              )}
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-slate-400 hover:text-brand-400">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4a3.8 3.8 0 01-1.4-.9 3.8 3.8 0 01-.9-1.4c-.2-.4-.4-1.1-.4-2.3-.1-1.2-.1-1.6-.1-4.8s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.3-.4 1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 5.8.1 5 .3 4.2.6c-.8.3-1.5.7-2.1 1.3C1.5 2.5 1.1 3.2.8 4 .5 4.8.3 5.6.2 6.9.1 8.1 0 8.5 0 11.8s0 3.7.1 4.9c.1 1.3.3 2.1.6 2.9.3.8.7 1.5 1.3 2.1.6.6 1.3 1 2.1 1.3.8.3 1.6.5 2.9.6 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.1-.3 2.9-.6.8-.3 1.5-.7 2.1-1.3.6-.6 1-1.3 1.3-2.1.3-.8.5-1.6.6-2.9.1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.1-1.3-.3-2.1-.6-2.9-.3-.8-.7-1.5-1.3-2.1A5.7 5.7 0 0020 2.9c-.8-.3-1.6-.5-2.9-.6C15.9.2 15.5.1 12.2.1 12.1 0 12 0 12 0zm0 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.9 1.4 1.4 0 000-2.9z"/></svg>
                </a>
              )}
              {settings.youtubeUrl && (
                <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-slate-400 hover:text-brand-400">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-800 py-4">
        <p className="container-page text-center text-xs text-slate-500">
          © {year} {name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

