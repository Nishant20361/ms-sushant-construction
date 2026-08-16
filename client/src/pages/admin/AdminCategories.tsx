import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiRequestError } from "../../lib/api";
import type { Category } from "../../types";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import { resolveImageUrl } from "../../lib/format";

export default function AdminCategories() {
  const { success, error } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    adminApi
      .getCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => setLoadError("Failed to load categories"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formOrder, setFormOrder] = useState("0");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormSlug("");
    setFormOrder("0");
    setFormImageUrl("");
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setFormName(c.name);
    setFormSlug(c.slug);
    setFormOrder(String(c.displayOrder));
    setFormImageUrl(c.imageUrl ?? "");
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormError(null);
    const name = formName.trim();
    const slug = formSlug.trim();
    const displayOrder = Number(formOrder);
    if (!name) return setFormError("Name is required");
    if (!slug) return setFormError("Slug is required");
    if (isNaN(displayOrder)) return setFormError("Valid display order required");

    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, { name, slug, imageUrl: formImageUrl || null, displayOrder, isActive: editing.isActive });
        success("Category updated");
      } else {
        await adminApi.createCategory({ name, slug, imageUrl: formImageUrl || null, displayOrder, isActive: true });
        success("Category created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) setFormError(e.message);
      else setFormError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadCategoryImage = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const result = await adminApi.uploadImage(file);
      setFormImageUrl(result.url);
    } catch (e) {
      setFormError(e instanceof ApiRequestError ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"? Products in this category will lose their category reference.`)) return;
    try {
      await adminApi.deleteCategory(c.id);
      success("Category deleted");
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Delete failed");
    }
  };

  const handleToggle = async (c: Category) => {
    try {
      await adminApi.updateCategory(c.id, { name: c.name, slug: c.slug, imageUrl: c.imageUrl, displayOrder: c.displayOrder, isActive: !c.isActive });
      success(c.isActive ? "Category deactivated" : "Category activated");
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Update failed");
    }
  };

  if (loading) return <LoadingState label="Loading categories…" />;
  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500">{categories.length} total</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Category</button>
      </div>

      {categories.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No categories yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900"><div className="flex items-center gap-3">{c.imageUrl ? <img src={resolveImageUrl(c.imageUrl) ?? ""} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">◇</div>}<span>{c.name}</span></div></td>
                  <td className="px-4 py-3 font-mono text-slate-500">{c.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{c.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleToggle(c)} className="text-xs font-semibold text-amber-600 hover:underline">
                        {c.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-xs font-semibold text-brand-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(c)} className="text-xs font-semibold text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="card mt-10 w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editing ? "Edit Category" : "Add Category"}
              </h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="label">Slug *</label>
                <input
                  className="input"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""))}
                  placeholder="e.g. acc-cement"
                />
                <p className="mt-1 text-xs text-slate-500">Auto-lowercased, hyphens replace spaces.</p>
              </div>
              <div>
                <label className="label">Display Order</label>
                <input className="input" type="number" min="0" value={formOrder} onChange={(e) => setFormOrder(e.target.value)} />
              </div>
              <div>
                <label className="label">Category Image</label>
                <div className="flex items-center gap-3">
                  {formImageUrl ? <img src={resolveImageUrl(formImageUrl) ?? ""} alt="Category preview" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400">No image</div>}
                  <label className="btn-secondary cursor-pointer">
                    {uploading ? "Uploading…" : formImageUrl ? "Change" : "Upload"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCategoryImage(file); event.target.value = ""; }} />
                  </label>
                  {formImageUrl ? <button type="button" onClick={() => setFormImageUrl("")} className="text-xs font-semibold text-red-600 hover:underline">Remove</button> : null}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
