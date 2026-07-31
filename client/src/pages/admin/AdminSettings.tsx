import { useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { SiteSettings } from "../../types";
import { resolveImageUrl } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

export default function AdminSettings() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .getSettings()
      .then(({ settings }) => setSettings(settings))
      .catch(() => setLoadError("Failed to load settings"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key: keyof SiteSettings, value: string | null) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value ?? "" });
  };

  const handleUpload = async (field: "logoUrl" | "heroBannerUrl", file: File) => {
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
      const res = await adminApi.updateSettings(settings);
      setSettings(res.settings);
      success("Settings saved");
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
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
    { key: "googleMapsUrl", label: "Google Maps Embed URL", type: "url" },
    { key: "aboutContent", label: "About Us Content", type: "textarea" },
    { key: "facebookUrl", label: "Facebook URL", type: "url" },
    { key: "instagramUrl", label: "Instagram URL", type: "url" },
    { key: "youtubeUrl", label: "YouTube URL", type: "url" },
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
            <label className="label">Hero Banner Image</label>
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
              {type === "textarea" ? (
                <textarea
                  id={key}
                  className="input min-h-[80px]"
                  rows={3}
                  value={settings[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                />
              ) : (
                <input
                  id={key}
                  className="input"
                  type={type === "url" ? "url" : type === "phone" ? "tel" : "text"}
                  value={settings[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary !px-8">
          {saving ? "Saving…" : "Save All Settings"}
        </button>
      </div>
    </div>
  );
}
