import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiRequestError, type ProductPayload } from "../../lib/api";
import type { Category, Product } from "../../types";
import { formatINR, resolveImageUrl } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";

interface FormState {
  id: number | null;
  name: string;
  description: string;
  unit: string;
  price: string;
  mrp: string;
  stock: string;
  isActive: boolean;
  categoryId: string;
  imageUrl: string | null;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  description: "",
  unit: "bag",
  price: "",
  mrp: "",
  stock: "0",
  isActive: true,
  categoryId: "",
  imageUrl: null,
};

export default function AdminProducts() {
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      adminApi.getProducts({ page, limit: 10, search: search || undefined }),
      adminApi.getCategories(),
      adminApi.getProfile().catch(() => null),
    ])
      .then(([p, c, profile]) => {
        setProducts(p.products);
        setPages(p.pages);
        setTotal(p.total);
        setCategories(c.categories);
        if (profile) setLowStockThreshold(profile.profile.lowStockThreshold);
      })
      .catch(() => setLoadError("Failed to load products"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0] ? String(categories[0].id) : "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      unit: p.unit,
      price: String(p.price),
      mrp: String(p.mrp),
      stock: String(p.stock),
      isActive: p.isActive,
      categoryId: String(p.categoryId),
      imageUrl: p.imageUrl,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const res = await adminApi.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: res.url }));
      success("Image uploaded");
    } catch (e) {
      if (e instanceof ApiRequestError) setFormError(e.message);
      else setFormError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      unit: form.unit.trim() || "bag",
      price: Number(form.price),
      mrp: Number(form.mrp),
      stock: Number(form.stock),
      isActive: form.isActive,
      categoryId: Number(form.categoryId),
      imageUrl: form.imageUrl,
    };
    if (!payload.name) return setFormError("Name is required");
    if (!payload.categoryId) return setFormError("Category is required");
    if (Number.isNaN(payload.price) || payload.price < 0) return setFormError("Valid price is required");
    if (Number.isNaN(payload.mrp) || payload.mrp < 0) return setFormError("Valid MRP is required");
    if (Number.isNaN(payload.stock) || payload.stock < 0) return setFormError("Valid stock is required");

    setSaving(true);
    try {
      if (form.id) {
        await adminApi.updateProduct(form.id, payload);
        success("Product updated");
      } else {
        await adminApi.createProduct(payload);
        success("Product created");
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

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteProduct(p.id);
      success("Product deleted");
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Delete failed");
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      await adminApi.updateProduct(p.id, {
        name: p.name,
        description: p.description ?? undefined,
        unit: p.unit,
        price: p.price,
        mrp: p.mrp,
        stock: p.stock,
        isActive: !p.isActive,
        categoryId: p.categoryId,
        imageUrl: p.imageUrl,
      });
      success(p.isActive ? "Product deactivated" : "Product activated");
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">{total} total</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Add Product
        </button>
      </div>

      <div className="w-full sm:max-w-xs">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input"
        />
      </div>

      {loading ? (
        <LoadingState label="Loading products…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : products.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No products found{search ? ` for "${search}"` : ""}.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">MRP</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
{products.map((p) => {
                const isLowStock = p.stock <= lowStockThreshold;
                return (
                <tr key={p.id} className={`hover:bg-slate-50 ${isLowStock ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-100">
                        {p.imageUrl ? (
                          <img
                            src={resolveImageUrl(p.imageUrl) ?? ""}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">🧱</div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatINR(p.price)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatINR(p.mrp)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= lowStockThreshold ? "flex items-center gap-1 font-semibold text-red-600" : "text-slate-700"}>
                      {p.stock <= lowStockThreshold && <span title="Low stock">⚠️</span>}
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleToggle(p)} className="text-xs font-semibold text-amber-600 hover:underline">
                        {p.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => openEdit(p)} className="text-xs font-semibold text-brand-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p)} className="text-xs font-semibold text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">
            ← Prev
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {pages}
          </span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary">
            Next →
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="card mt-10 w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {form.id ? "Edit Product" : "Add Product"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bag, kg, sheet, piece" />
                </div>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[70px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Price (₹) *</label>
                  <input className="input" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <label className="label">MRP (₹) *</label>
                  <input className="input" type="number" min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
                </div>
                <div>
                  <label className="label">Stock *</label>
                  <input className="input" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category *</label>
                  <select
                    className="input"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Status</label>
                  <label className="flex items-center gap-2 pt-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Product Image</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-lg bg-slate-100">
                    {form.imageUrl ? (
                      <img
                        src={resolveImageUrl(form.imageUrl) ?? ""}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">🧱</div>
                    )}
                  </div>
                  <label className="btn-secondary cursor-pointer">
                    {uploading ? "Uploading…" : "Upload Image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {form.imageUrl && (
                    <button onClick={() => setForm({ ...form, imageUrl: null })} className="text-xs font-semibold text-red-600 hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">JPEG, PNG or WebP. Max 5 MB.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || uploading} className="btn-primary">
                {saving ? "Saving…" : form.id ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

