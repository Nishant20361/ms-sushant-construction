import { useCallback, useEffect, useState } from "react";
import { adminApi, ApiRequestError, type ProductPayload } from "../../lib/api";
import type { Category, Product } from "../../types";
import { formatINR, resolveImageUrl } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/Loading";
import { useToast } from "../../components/Toast";
import {
  Package,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit,
  Trash2,
  Layers,
  Sparkles,
  X,
  UploadCloud,
  Check,
} from "lucide-react";

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

interface StockModalState {
  product: Product | null;
  action: "ADD" | "SET" | "DEDUCT";
  quantity: string;
  totalPurchaseCost: string;
  purchaseRate: string;
  supplier: string;
  invoiceNumber: string;
  reason: string;
}

const EMPTY_STOCK_MODAL: StockModalState = {
  product: null,
  action: "ADD",
  quantity: "",
  totalPurchaseCost: "",
  purchaseRate: "",
  supplier: "",
  invoiceNumber: "",
  reason: "",
};

export default function AdminProducts() {
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Full product create / edit modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Stock Adjustment Modal
  const [stockModal, setStockModal] = useState<StockModalState>(EMPTY_STOCK_MODAL);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      adminApi.getProducts({
        page,
        limit: 15,
        search: search || undefined,
        categoryId: selectedCategoryId ?? undefined,
      }),
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
  }, [page, search, selectedCategoryId]);

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

  const openStockModal = (p: Product) => {
    setStockModal({
      ...EMPTY_STOCK_MODAL,
      product: p,
      action: "ADD",
    });
    setStockError(null);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setFormError(null);
    try {
      const res = await adminApi.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: res.url }));
      success("Image uploaded successfully");
    } catch (e) {
      if (e instanceof ApiRequestError) setFormError(e.message);
      else setFormError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    const price = Math.round(Number(form.price) * 100) / 100;
    const mrp = Math.round(Number(form.mrp) * 100) / 100;
    const stock = Math.round(Number(form.stock) * 1000) / 1000;
    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      unit: form.unit.trim() || "bag",
      price,
      mrp,
      stock,
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
        const result = await adminApi.updateProduct(form.id, payload);
        setProducts((current) =>
          current.map((product) => (product.id === result.product.id ? result.product : product))
        );
        success("Product updated successfully");
      } else {
        await adminApi.createProduct(payload);
        success("Product created successfully");
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

  const handleStockAdjustment = async () => {
    if (!stockModal.product) return;
    const qty = parseFloat(stockModal.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setStockError("Please enter a valid positive quantity");
      return;
    }

    if (stockModal.action === "DEDUCT" && qty > stockModal.product.stock) {
      setStockError(`Cannot deduct ${qty} ${stockModal.product.unit}. Current stock is only ${stockModal.product.stock}.`);
      return;
    }

    setStockSaving(true);
    setStockError(null);
    try {
      const totalCost = parseFloat(stockModal.totalPurchaseCost);
      const rate = parseFloat(stockModal.purchaseRate);

      const result = await adminApi.adjustStock(stockModal.product.id, {
        action: stockModal.action,
        quantity: qty,
        totalPurchaseCost: !Number.isNaN(totalCost) && totalCost >= 0 ? totalCost : undefined,
        purchaseRate: !Number.isNaN(rate) && rate >= 0 ? rate : undefined,
        supplier: stockModal.supplier || undefined,
        invoiceNumber: stockModal.invoiceNumber || undefined,
        reason: stockModal.reason || undefined,
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === result.product.id ? result.product : p))
      );

      const actionText =
        stockModal.action === "ADD"
          ? `Added +${qty} ${result.product.unit}`
          : stockModal.action === "SET"
          ? `Stock set to ${qty} ${result.product.unit}`
          : `Deducted -${qty} ${result.product.unit}`;

      success(`Stock updated: ${result.product.name} (${actionText})`);
      setStockModal(EMPTY_STOCK_MODAL);
    } catch (e: any) {
      if (e instanceof ApiRequestError) setStockError(e.message);
      else setStockError("Failed to update stock");
    } finally {
      setStockSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteProduct(p.id);
      success("Product deleted successfully");
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Delete failed");
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      const result = await adminApi.toggleProduct(p.id);
      setProducts((current) =>
        current.map((product) => (product.id === result.product.id ? result.product : product))
      );
      success(p.isActive ? "Product deactivated" : "Product activated");
      load();
    } catch (e) {
      if (e instanceof ApiRequestError) error(e.message);
      else error("Update failed");
    }
  };

  // Stock summary calculations
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= lowStockThreshold).length;
  const wellStockedCount = products.filter((p) => p.stock > lowStockThreshold).length;

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>Products & Stock Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Category-wise stock tracking: Stock auto-deducts on checkout and restores on cancellation.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-brand-500 hover:to-amber-500 transition active:scale-95 shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Auto-Deduction Info Notification Banner */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-bold text-slate-900">
              Automatic Stock Deduction & Restoration Active
            </p>
            <p className="mt-0.5 text-slate-600 leading-relaxed">
              Whenever a customer places an order or an invoice is generated, the item stock is automatically decremented. If an order is cancelled, stock is automatically returned to inventory. You can use <strong>"+ Add Stock"</strong> anytime new shipments or batches arrive.
            </p>
          </div>
        </div>
      </div>

      {/* Stock Health KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">{wellStockedCount}</p>
            <p className="text-xs font-medium text-slate-500">Well Stocked Items</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-900">{lowStockCount}</p>
            <p className="text-xs font-medium text-slate-500">Low Stock Alert (≤ {lowStockThreshold} units)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-black text-red-900">{outOfStockCount}</p>
            <p className="text-xs font-medium text-slate-500">Out of Stock Items</p>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategoryId(null);
              setPage(1);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              selectedCategoryId === null
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Categories ({total})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategoryId(c.id);
                setPage(1);
              }}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                selectedCategoryId === c.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search products by name or unit…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-10 text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Products & Stock Table */}
      {loading ? (
        <LoadingState label="Loading product catalog & stock…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-sm">
          <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
          <p className="font-bold text-slate-800">No products found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? `No results matching "${search}"` : "Add your first product to start tracking stock."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Product Info</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">MRP</th>
                  <th className="py-3 px-4">Live Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Stock & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock > 0 && p.stock <= lowStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 transition ${
                        isOutOfStock ? "bg-red-50/30" : isLowStock ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* Product details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80">
                            {p.imageUrl ? (
                              <img
                                src={resolveImageUrl(p.imageUrl) ?? ""}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400 font-bold">
                                🧱
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]">{p.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">Unit: {p.unit}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
                          <Layers className="h-3 w-3 text-slate-400" />
                          <span>{p.category?.name ?? "General"}</span>
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 font-black text-slate-900 text-sm">
                        {formatINR(p.price)}
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-4 text-slate-400 line-through">
                        {formatINR(p.mrp)}
                      </td>

                      {/* Live Stock Level with Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-black ${
                                isOutOfStock
                                  ? "text-red-600"
                                  : isLowStock
                                  ? "text-amber-600"
                                  : "text-slate-900"
                              }`}
                            >
                              {p.stock}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">{p.unit}</span>
                          </div>

                          <div>
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                                <XCircle className="h-3 w-3" />
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                <AlertTriangle className="h-3 w-3" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <Check className="h-3 w-3" />
                                In Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Active / Inactive Status */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggle(p)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle active status"
                        >
                          {p.isActive ? "Active on Store" : "Hidden / Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Restock / Add Stock Button */}
                          <button
                            onClick={() => openStockModal(p)}
                            className="inline-flex items-center gap-1 rounded-xl bg-brand-50 border border-brand-200 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-600 hover:text-white transition"
                            title="Add or update stock"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>+ Add Stock</span>
                          </button>

                          {/* Full Edit */}
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 transition"
                            title="Edit product info & price"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(p)}
                            className="rounded-xl border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-600 hover:text-white transition"
                            title="Delete product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
          >
            ← Previous
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {page} of {pages} ({total} products)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-secondary text-xs px-3 py-1.5 rounded-xl"
          >
            Next →
          </button>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {stockModal.product && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-brand-600" />
                  <span>Update Stock Level</span>
                </h3>
                <p className="text-xs text-slate-500">{stockModal.product.name}</p>
              </div>
              <button
                onClick={() => setStockModal(EMPTY_STOCK_MODAL)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Stock Banner */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Current Stock Available
                </span>
                <p className="text-lg font-black text-slate-900">
                  {stockModal.product.stock} <span className="text-xs font-semibold text-slate-500">{stockModal.product.unit}</span>
                </p>
              </div>
              <span className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                {stockModal.product.category?.name || "General"}
              </span>
            </div>

            {/* Adjustment Type Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStockModal((s) => ({ ...s, action: "ADD" }))}
                className={`rounded-lg py-1.5 transition ${
                  stockModal.action === "ADD"
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Add Stock
              </button>
              <button
                type="button"
                onClick={() => setStockModal((s) => ({ ...s, action: "SET" }))}
                className={`rounded-lg py-1.5 transition ${
                  stockModal.action === "SET"
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                = Set Exact
              </button>
              <button
                type="button"
                onClick={() => setStockModal((s) => ({ ...s, action: "DEDUCT" }))}
                className={`rounded-lg py-1.5 transition ${
                  stockModal.action === "DEDUCT"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                - Deduct Stock
              </button>
            </div>

            {/* Quick Increment Preset Chips (When Adding) */}
            {stockModal.action === "ADD" && (
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quick Add Presets:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 25, 50, 100, 250, 500].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStockModal((s) => ({ ...s, quantity: String(num) }))}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition"
                    >
                      +{num} {stockModal.product?.unit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <label className="label text-xs font-bold">
                {stockModal.action === "ADD"
                  ? "Quantity to Add (खरीदी गई मात्रा) *"
                  : stockModal.action === "SET"
                  ? "New Exact Total Stock *"
                  : "Quantity to Deduct *"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder={`Enter ${stockModal.product.unit} quantity...`}
                  value={stockModal.quantity}
                  onChange={(e) => {
                    const qVal = e.target.value;
                    const qNum = parseFloat(qVal);
                    const costNum = parseFloat(stockModal.totalPurchaseCost);
                    let autoRate = stockModal.purchaseRate;
                    if (!Number.isNaN(qNum) && qNum > 0 && !Number.isNaN(costNum) && costNum >= 0) {
                      autoRate = (costNum / qNum).toFixed(2);
                    }
                    setStockModal((s) => ({ ...s, quantity: qVal, purchaseRate: autoRate }));
                  }}
                  className="input pr-16 text-sm font-black"
                  autoFocus
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                  {stockModal.product.unit}
                </span>
              </div>
            </div>

            {/* Purchase Cost & Rate Calculation (When Adding Stock) */}
            {stockModal.action === "ADD" && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3.5 space-y-3">
                <p className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                  <span>💰</span>
                  <span>क्रय मूल्य व बैच लागत (Purchase Cost & FIFO Batch)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-[11px] font-bold text-slate-700">
                      कुल खरीद मूल्य (Total Purchase Amount ₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5000"
                      value={stockModal.totalPurchaseCost}
                      onChange={(e) => {
                        const costVal = e.target.value;
                        const costNum = parseFloat(costVal);
                        const qNum = parseFloat(stockModal.quantity);
                        let autoRate = "";
                        if (!Number.isNaN(costNum) && !Number.isNaN(qNum) && qNum > 0) {
                          autoRate = (costNum / qNum).toFixed(2);
                        }
                        setStockModal((s) => ({
                          ...s,
                          totalPurchaseCost: costVal,
                          purchaseRate: autoRate,
                        }));
                      }}
                      className="input text-xs font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="label text-[11px] font-bold text-slate-700">
                      प्रति यूनिट लागत (Rate / {stockModal.product?.unit} ₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 100"
                      value={stockModal.purchaseRate}
                      onChange={(e) => {
                        const rateVal = e.target.value;
                        const rateNum = parseFloat(rateVal);
                        const qNum = parseFloat(stockModal.quantity);
                        let autoCost = "";
                        if (!Number.isNaN(rateNum) && !Number.isNaN(qNum) && qNum > 0) {
                          autoCost = (rateNum * qNum).toFixed(2);
                        }
                        setStockModal((s) => ({
                          ...s,
                          purchaseRate: rateVal,
                          totalPurchaseCost: autoCost,
                        }));
                      }}
                      className="input text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-[11px] text-slate-600">सप्लायर का नाम (Supplier)</label>
                    <input
                      type="text"
                      placeholder="e.g. ACC Dealer / Plant"
                      value={stockModal.supplier}
                      onChange={(e) => setStockModal((s) => ({ ...s, supplier: e.target.value }))}
                      className="input text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="label text-[11px] text-slate-600">बिल / चालान संख्या (Invoice #)</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-089"
                      value={stockModal.invoiceNumber}
                      onChange={(e) => setStockModal((s) => ({ ...s, invoiceNumber: e.target.value }))}
                      className="input text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reason / Reference */}
            <div>
              <label className="label text-xs">Note / Reference (Optional)</label>
              <input
                type="text"
                placeholder="e.g. New shipment from supplier, inventory audit, etc."
                value={stockModal.reason}
                onChange={(e) => setStockModal((s) => ({ ...s, reason: e.target.value }))}
                className="input text-xs"
              />
            </div>

            {stockError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {stockError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStockModal(EMPTY_STOCK_MODAL)}
                className="btn-secondary text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStockAdjustment}
                disabled={stockSaving}
                className="btn-primary text-xs rounded-xl"
              >
                {stockSaving ? "Updating..." : "Confirm Stock Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PRODUCT CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="card my-8 w-full max-w-lg p-5 sm:p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {form.id ? "Edit Product Details" : "Add New Material / Product"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Product Name *</label>
                  <input
                    className="input text-xs"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ultratech Cement (PPC)"
                  />
                </div>
                <div>
                  <label className="label text-xs">Unit Type *</label>
                  <input
                    className="input text-xs"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="bag, piece, ton, sqft, kg"
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs">Description</label>
                <textarea
                  className="input min-h-[60px] text-xs"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Material specs, grade, manufacturer details..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Selling Price (₹) *</label>
                  <input
                    className="input text-xs font-bold"
                    type="number"
                    min="0"
                    step="any"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">MRP (₹) *</label>
                  <input
                    className="input text-xs"
                    type="number"
                    min="0"
                    step="any"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Current Stock *</label>
                  <input
                    className="input text-xs font-bold"
                    type="number"
                    min="0"
                    step="any"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Category *</label>
                  <select
                    className="input text-xs"
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
                  <label className="label text-xs">Store Visibility</label>
                  <label className="flex items-center gap-2 pt-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    Active on Storefront
                  </label>
                </div>
              </div>

              <div>
                <label className="label text-xs">Product Image</label>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                    {form.imageUrl ? (
                      <img
                        src={resolveImageUrl(form.imageUrl) ?? ""}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 font-bold">
                        🧱
                      </div>
                    )}
                  </div>
                  <label className="btn-secondary text-xs cursor-pointer rounded-xl">
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>{uploading ? "Uploading…" : "Upload Photo"}</span>
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
                    <button
                      onClick={() => setForm({ ...form, imageUrl: null })}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-xs rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="btn-primary text-xs rounded-xl"
              >
                {saving ? "Saving…" : form.id ? "Save Product Changes" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
