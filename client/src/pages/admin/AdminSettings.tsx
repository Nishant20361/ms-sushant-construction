import { useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { AdminProfile, SiteSettings } from "../../types";
import { resolveImageUrl } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

const androidFieldLabels: Record<string, string> = {
  androidLatestVersion: "Latest Android Version",
  androidLatestBuild: "Latest Android Build Number",
  androidApkUrl: "Android APK Download URL",
  androidUpdateMessage: "Update Message",
};

function normalizeSettingsForSave(settings: SiteSettings): SiteSettings {
  const build = Number(settings.androidLatestBuild);
  return {
    ...settings,
    androidUpdateEnabled: Boolean(settings.androidUpdateEnabled),
    androidLatestVersion: String(settings.androidLatestVersion ?? "").trim(),
    androidLatestBuild: Number.isFinite(build) ? build : 0,
    androidApkUrl: String(settings.androidApkUrl ?? "").trim(),
    androidUpdateMessage: String(settings.androidUpdateMessage ?? "").trim(),
  };
}

function validationMessage(requestError: ApiRequestError): string {
  const issue = requestError.details?.[0];
  if (!issue) return requestError.message;
  const label = androidFieldLabels[issue.path] ?? issue.path;
  return label ? `${label}: ${issue.message}` : issue.message;
}

export default function AdminSettings() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [threshold, setThreshold] = useState(10);

const load = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      adminApi.getSettings(),
      adminApi.getProfile().catch(() => null),
    ])
      .then(([s, p]) => {
        setSettings(s.settings);
        if (p) {
          setProfile(p.profile);
          setThreshold(p.profile.lowStockThreshold);
        }
      })
      .catch(() => setLoadError("Failed to load settings"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSaveThreshold = async () => {
    try {
      const res = await adminApi.updateProfile({ lowStockThreshold: threshold });
      setProfile(res.profile);
      success("Low stock threshold saved");
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Save failed");
    }
  };

  const update = (key: keyof SiteSettings, value: SiteSettings[keyof SiteSettings] | null) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value ?? "" });
  };

  const handleUpload = async (field: "logoUrl" | "heroBannerUrl" | "mobileHeroBannerUrl" | "businessLogoUrl", file: File) => {
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      update(field, res.url);
      success("Image uploaded");
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await adminApi.updateSettings(normalizeSettingsForSave(settings));
      setSettings(res.settings);
      success("Settings saved");
    } catch (e) {
      if (e instanceof ApiRequestError) error(validationMessage(e));
      else error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading settings…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!settings) return null;

  const fields: { key: keyof SiteSettings; label: string; type: "text" | "textarea" | "url" | "image" | "phone" }[] = [
    { key: "companyName", label: "Company Name", type: "text" },
    { key: "tagline", label: "Tagline", type: "text" },
    { key: "heroTitle", label: "Hero Title", type: "text" },
    { key: "heroSubtitle", label: "Hero Subtitle", type: "text" },
    { key: "phone", label: "Phone Number", type: "phone" },
    { key: "whatsappNumber", label: "WhatsApp Number", type: "phone" },
    { key: "email", label: "Email", type: "text" },
    { key: "address", label: "Address", type: "textarea" },
    { key: "googleMapsUrl", label: "Business Location / Google Maps Link", type: "url" },
    { key: "aboutContent", label: "About Us Content", type: "textarea" },
    { key: "facebookUrl", label: "Facebook URL", type: "url" },
    { key: "instagramUrl", label: "Instagram URL", type: "url" },
    { key: "youtubeUrl", label: "YouTube URL", type: "url" },
  ];

  const businessFields: { key: keyof SiteSettings; label: string; type: "text" | "textarea" | "phone" }[] = [
    { key: "businessName", label: "Business Name", type: "text" },
    { key: "businessAddress", label: "Business Address", type: "textarea" },
    { key: "gstNumber", label: "GST Number", type: "text" },
    { key: "businessMobile", label: "Business Mobile", type: "phone" },
    { key: "businessEmail", label: "Business Email", type: "text" },
  ];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Website Settings</h2>
          <p className="text-sm text-slate-500">Manage your public website content</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save All Settings"}
        </button>
      </div>

      <div className="card p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Logo */}
          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
                {settings.logoUrl ? (
                  <img
                    src={resolveImageUrl(settings.logoUrl) ?? ""}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl">M</div>
                )}
              </div>
              <label className="btn-secondary cursor-pointer">
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("logoUrl", f);
                    e.target.value = "";
                  }}
                />
              </label>
              {settings.logoUrl && (
                <button onClick={() => update("logoUrl", null)} className="text-xs font-semibold text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Hero Banner */}
          <div>
            <label className="label">Website Hero Banner Image</label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 overflow-hidden rounded-lg bg-slate-100">
                {settings.heroBannerUrl ? (
                  <img
                    src={resolveImageUrl(settings.heroBannerUrl) ?? ""}
                    alt="Banner"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Banner</div>
                )}
              </div>
              <label className="btn-secondary cursor-pointer">
                Upload
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("heroBannerUrl", f);
                    e.target.value = "";
                  }}
                />
              </label>
              {settings.heroBannerUrl && (
                <button onClick={() => update("heroBannerUrl", null)} className="text-xs font-semibold text-red-600 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {fields.map(({ key, label, type }) => (
            <div key={key} className={type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={key}>
                {label}
              </label>
              {key === "googleMapsUrl" ? <p className="mb-1 text-xs text-slate-500">Paste the Google Maps share/location link for your shop.</p> : null}
              {type === "textarea" ? (
                <textarea
                  id={key}
                  className="input min-h-[80px]"
                  rows={3}
                  value={String(settings[key] ?? "")}
                  onChange={(e) => update(key, e.target.value)}
                />
              ) : (
                <input
                  id={key}
                  className="input"
                  type={type === "url" ? "url" : type === "phone" ? "tel" : "text"}
                  value={String(settings[key] ?? "")}
                  onChange={(e) => update(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900">Mobile Home Banner</h3>
        <p className="mt-1 text-sm text-slate-500">This banner is shown only in the mobile app. It is separate from the website hero banner.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="mobileHeroTitle">Mobile Banner Title</label><input id="mobileHeroTitle" className="input" value={settings.mobileHeroTitle} onChange={(event) => update("mobileHeroTitle", event.target.value)} placeholder="Quality Construction Materials" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="mobileHeroSubtitle">Mobile Banner Description</label><textarea id="mobileHeroSubtitle" className="input min-h-[80px]" rows={3} maxLength={400} value={settings.mobileHeroSubtitle} onChange={(event) => update("mobileHeroSubtitle", event.target.value)} placeholder="Describe your mobile-app materials and services." /></div>
          <div className="sm:col-span-2"><label className="label">Mobile Banner Image</label><div className="mt-2 flex items-center gap-3"><div className="h-16 w-24 overflow-hidden rounded-lg bg-slate-100">{settings.mobileHeroBannerUrl ? <img src={resolveImageUrl(settings.mobileHeroBannerUrl) ?? ""} alt="Mobile banner" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Mobile</div>}</div><label className="btn-secondary cursor-pointer">{uploading ? "Uploading…" : "Upload"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleUpload("mobileHeroBannerUrl", file); event.target.value = ""; }} /></label>{settings.mobileHeroBannerUrl ? <button onClick={() => update("mobileHeroBannerUrl", null)} className="text-xs font-semibold text-red-600 hover:underline">Remove</button> : null}</div></div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900">Latest Update / Announcement</h3>
        <p className="mt-1 text-sm text-slate-500">Show a short update below categories in the mobile app.</p>
        <label className="mt-4 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={settings.latestUpdateEnabled}
            onChange={(event) => update("latestUpdateEnabled", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />
          <span className="text-sm font-semibold text-slate-700">Enable latest update</span>
        </label>
        <label className="label mt-4" htmlFor="latestUpdateText">Announcement text</label>
        <textarea
          id="latestUpdateText"
          className="input min-h-[84px]"
          rows={3}
          maxLength={300}
          value={settings.latestUpdateText}
          onChange={(event) => update("latestUpdateText", event.target.value)}
          placeholder="Example: ACC Cement new stock is now available."
        />
        <p className="mt-1 text-right text-xs text-slate-500">{settings.latestUpdateText.length}/300</p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900">Android App Update</h3>
        <p className="mt-1 text-sm text-slate-500">Enable this only after a newer Android APK has been approved. Paste the direct APK artifact URL, not an Expo build-details page.</p>
        <label className="mt-4 flex cursor-pointer items-center gap-3"><input type="checkbox" checked={settings.androidUpdateEnabled} onChange={(event) => update("androidUpdateEnabled", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600" /><span className="text-sm font-semibold text-slate-700">Enable update notification</span></label>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="androidLatestVersion">Latest Android Version</label><input id="androidLatestVersion" className="input" value={settings.androidLatestVersion} onChange={(event) => update("androidLatestVersion", event.target.value)} placeholder="1.0.2" /></div>
          <div><label className="label" htmlFor="androidLatestBuild">Latest Android Build Number</label><input id="androidLatestBuild" className="input" type="number" min="1" step="1" value={settings.androidLatestBuild || ""} onChange={(event) => update("androidLatestBuild", Number(event.target.value) || 0)} placeholder="3" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="androidApkUrl">Android APK Download URL</label><input id="androidApkUrl" className="input" type="url" value={settings.androidApkUrl} onChange={(event) => update("androidApkUrl", event.target.value)} placeholder="https://.../your-app.apk" /><p className="mt-1 text-xs text-slate-500">Must be a direct HTTPS URL ending in .apk.</p></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="androidUpdateMessage">Update Message</label><textarea id="androidUpdateMessage" className="input min-h-[80px]" rows={3} maxLength={300} value={settings.androidUpdateMessage} onChange={(event) => update("androidUpdateMessage", event.target.value)} placeholder="A new version is available with improvements and bug fixes." /></div>
        </div>
      </div>

{/* Business Invoice Details */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900">Business Invoice Details</h3>
        <p className="mt-1 text-sm text-slate-500">
          These details appear on customer invoices, bills and PDF downloads.
        </p>

        <div className="mt-4">
          <label className="label">Invoice Logo</label>
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
              {settings.businessLogoUrl ? (
                <img
                  src={resolveImageUrl(settings.businessLogoUrl) ?? ""}
                  alt="Invoice Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl text-slate-400">B</div>
              )}
            </div>
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload("businessLogoUrl", f);
                  e.target.value = "";
                }}
              />
            </label>
            {settings.businessLogoUrl && (
              <button onClick={() => update("businessLogoUrl", null)} className="text-xs font-semibold text-red-600 hover:underline">
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {businessFields.map(({ key, label, type }) => (
            <div key={key} className={type === "textarea" ? "sm:col-span-2" : ""}>
              <label className="label" htmlFor={key}>
                {label}
              </label>
              {type === "textarea" ? (
                <textarea
                  id={key}
                  className="input min-h-[80px]"
                  rows={3}
                  value={String(settings[key] ?? "")}
                  onChange={(e) => update(key, e.target.value)}
                />
              ) : (
                <input
                  id={key}
                  className="input"
                  type={type === "phone" ? "tel" : "text"}
                  value={String(settings[key] ?? "")}
                  onChange={(e) => update(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

{/* Low Stock Threshold */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h3>
        <p className="mt-1 text-sm text-slate-500">
          Products with stock at or below this threshold will be highlighted.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="999"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="input w-32"
          />
          <button onClick={handleSaveThreshold} className="btn-primary">
            Save Threshold
          </button>
        </div>
      </div>

      {/* Notification Email (read-only from admin profile) */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900">Order Notification Email</h3>
        <p className="mt-1 text-sm text-slate-500">
          New order emails are sent to the email address in your admin profile. Update it below.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="email"
            value={profile?.email ?? ""}
            onChange={async (e) => {
              try {
                const res = await adminApi.updateProfileEmail(e.target.value || null);
                setProfile((prev) => prev ? { ...prev, email: res.email } : prev);
                success("Notification email updated");
              } catch (err) {
                if (err instanceof ApiRequestError) error(err.message);
                else error("Update failed");
              }
            }}
            className="input flex-1"
            placeholder="admin@example.com"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Leave blank to disable email notifications. Changes take effect immediately.
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary !px-8">
          {saving ? "Saving…" : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
