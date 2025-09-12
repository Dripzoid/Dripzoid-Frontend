// src/pages/ProductsAdmin.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../utils/api";
import BulkUpload from "./BulkUpload";
import {
  Plus,
  Upload,
  Eye,
  Search,
  Edit,
  Trash2,
  Package,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Layers,
  List,
  Save,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Tag,
} from "lucide-react";
import { motion } from "framer-motion";

/* ======= STYLE CONSTANTS (Tailwind utility strings) ======= */
const inputCls =
  "w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black dark:focus:ring-white transition";
const textareaCls = inputCls + " resize-none";
const btnPrimaryCls =
  "px-4 py-2 rounded-lg shadow-sm bg-black text-white dark:bg-white dark:text-black hover:scale-[1.02] transition-transform disabled:opacity-60";
const btnSecondaryCls =
  "px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition";
const cardCls =
  "p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition";

/* ======= Normalize helper (keeps compatibility with different API shapes) ======= */
const normalizeResponse = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === "object") {
    if (res.data.data || typeof res.data.total !== "undefined") return res.data;
    return res.data;
  }
  return res;
};

/* ======= CategoryFormModal ======= */
function CategoryFormModal({ category, categories, onClose, onSave }) {
  const defaultForm = {
    id: null,
    name: "",
    category: "Men",
    slug: "",
    parent_id: null,
    status: "active",
    sort_order: 0,
    description: "",
    metadata: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category && Object.keys(category).length) {
      setForm({
        id: category.id ?? category._id ?? null,
        name: category.subcategory ?? category.name ?? category.label ?? "",
        category: category.category ?? "Men",
        slug: category.slug ?? "",
        parent_id: category.parent_id ?? category.parentId ?? null,
        status: category.status ?? "active",
        sort_order: Number(category.sort_order ?? 0),
        description: category.description ?? "",
        metadata: category.metadata ? (typeof category.metadata === "string" ? category.metadata : JSON.stringify(category.metadata)) : "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [category]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        slug: form.slug || undefined,
        parent_id: form.parent_id || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
        description: form.description || "",
        metadata: form.metadata ? JSON.parse(form.metadata) : null,
      };

      let res;
      if (form.id) {
        res = await api.put(`/api/admin/categories/${form.id}`, payload, true);
      } else {
        res = await api.post("/api/admin/categories", payload, true);
      }

      if (typeof onSave === "function") await onSave(normalizeResponse(res));
      onClose && onClose();
    } catch (err) {
      console.error("Save category error:", err);
      alert("Failed to save category. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose && onClose()} />
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-auto max-h-[92vh] border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{form.id ? "Edit Category" : "Add Category"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create or update categories and subcategories. API-ready.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onClose && onClose()} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700">Close</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Subcategory name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />

          <select className={inputCls} value={form.category} onChange={(e) => setField("category", e.target.value)}>
            <option>Men</option>
            <option>Women</option>
            <option>Kids</option>
          </select>

          <input className={inputCls} placeholder="Slug (optional)" value={form.slug} onChange={(e) => setField("slug", e.target.value)} />

          <select className={inputCls} value={form.parent_id ?? ""} onChange={(e) => setField("parent_id", e.target.value || null)}>
            <option value="">No parent</option>
            {categories
              .filter((c) => c.id !== form.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.category ?? c.category_name ?? ""} → ${c.subcategory ?? c.name ?? c.label ?? c.sub || ""}`}
                </option>
              ))}
          </select>

          <select className={inputCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input className={inputCls} placeholder="Sort order" type="number" value={form.sort_order} onChange={(e) => setField("sort_order", e.target.value)} />

          <input className={inputCls} placeholder="Short description" value={form.description} onChange={(e) => setField("description", e.target.value)} />

          <textarea className={textareaCls + " sm:col-span-2"} placeholder='Metadata JSON (e.g. {"icon":"shirt.png"})' value={form.metadata} onChange={(e) => setField("metadata", e.target.value)} rows={4} />
        </div>
      </form>
    </div>
  );
}

/* ======= CategoryManagement Panel ======= */
function CategoryManagement({ categories, setCategories, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const openForEdit = (c) => {
    setEditing(c);
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    await onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete category/subcategory? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/categories/${id}`, true);
      await onRefresh();
    } catch (err) {
      console.error("Delete category error:", err);
      alert("Failed to delete. See console.");
    }
  };

  const toggleStatus = async (c) => {
    try {
      await api.put(`/api/admin/categories/${c.id}`, { status: c.status === "active" ? "inactive" : "active" }, true);
      await onRefresh();
    } catch (err) {
      console.error("Toggle status error:", err);
      alert("Failed to toggle status. See console.");
    }
  };

  // Build nested tree by parent_id for display
  const tree = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = { ...c, children: [] }));
    const roots = [];
    categories.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id]);
      else roots.push(map[c.id]);
    });
    // group by main category ordering
    return roots.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories]);

  const renderNode = (node, level = 0) => {
    return (
      <div key={node.id} className="pl-2">
        <div className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 grid place-items-center rounded bg-gray-100 dark:bg-gray-800">
              <Tag className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{node.subcategory ?? node.name ?? node.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{node.category}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button title="Toggle status" onClick={() => toggleStatus(node)} className={`px-2 py-1 rounded text-sm ${node.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              {node.status === "active" ? "Active" : "Inactive"}
            </button>
            <button onClick={() => openForEdit(node)} className="p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"><Edit className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(node.id)} className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900 text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="ml-6 mt-2 space-y-2">
            {node.children.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((c) => renderNode(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Category Management</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage subcategories, nesting, ordering and status across Men / Women / Kids.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCreate} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black">
            <PlusCircle className="w-4 h-4" /> Add Subcategory
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {tree.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No categories yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Men','Women','Kids'].map((main) => (
              <div key={main} className="p-3 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 grid place-items-center rounded bg-black text-white">{main[0]}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{main}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Main category</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-auto">
                  {categories.filter(c => (c.category || c.category_name) === main).length === 0 ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400">No subcategories</div>
                  ) : (
                    categories
                      .filter(c => (c.category || c.category_name) === main && !c.parent_id)
                      .sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((root) => renderNode(root))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CategoryFormModal
          category={editing}
          categories={categories}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ======= ProductFormModal (original, kept unchanged) ======= */
function ProductFormModal({ product, onClose, onSave }) {
  const defaultForm = {
    name: "",
    category: "",
    price: 0,
    actualPrice: 0,
    images: [],
    rating: 0,
    sizes: "",
    colors: "",
    originalPrice: 0,
    description: "",
    subcategory: "",
    stock: 0,
    featured: 0,
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  useEffect(() => {
    if (product && Object.keys(product).length > 0) {
      setForm({
        name: product.name ?? "",
        category: product.category ?? "",
        price: Number(product.price ?? 0),
        actualPrice: Number(product.actualPrice ?? product.price ?? 0),
        images: product.images ? String(product.images).split(",").filter(Boolean) : [],
        rating: Number(product.rating ?? 0),
        sizes: product.sizes ?? "",
        colors: product.colors ?? "",
        originalPrice: Number(product.originalPrice ?? 0),
        description: product.description ?? "",
        subcategory: product.subcategory ?? "",
        stock: Number(product.stock ?? 0),
        featured: Number(product.featured ?? 0),
      });
    } else {
      setForm(defaultForm);
    }
  }, [product]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingCount((c) => c + files.length);

    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const fd = new FormData();
          fd.append("image", file);
          const res = await api.formPost("/api/upload", fd, true);
          const url =
            res?.url ||
            res?.secure_url ||
            res?.data?.url ||
            res?.data?.secure_url ||
            (res?.public_id && res?.secure_url);

          if (!url) {
            console.warn("Upload returned unexpected shape:", res);
            throw new Error("No URL returned from upload");
          }
          return url;
        })
      );

      setForm((s) => ({
        ...s,
        images: [...(s.images || []), ...uploads],
      }));
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploadingCount((c) => Math.max(0, c - files.length));
      if (e.target) e.target.value = "";
    }
  };

  const removeImage = (url) => {
    setForm((s) => ({ ...s, images: s.images.filter((i) => i !== url) }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        actualPrice: Number(form.actualPrice) || Number(form.price) || 0,
        originalPrice: Number(form.originalPrice) || 0,
        rating: Number(form.rating) || 0,
        stock: Number(form.stock) || 0,
        featured: Number(form.featured) ? 1 : 0,
        images: (form.images || []).join(","),
      };

      let resp;
      if (product && product.id) {
        resp = await api.put(`/api/admin/products/${product.id}`, payload, true);
      } else {
        resp = await api.post(`/api/admin/products`, payload, true);
      }

      if (typeof onSave === "function") {
        await onSave(resp);
      } else {
        onClose && onClose();
      }
    } catch (err) {
      console.error("Save product error:", err);
      alert("Failed to save product — check console");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-auto max-h-[92vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {product ? "Edit Product" : "Add Product"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Fill product details. Images are uploaded to your configured upload route.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onClose && onClose()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className={inputCls} placeholder="Product name" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
          <input className={inputCls} placeholder="Category" value={form.category} onChange={(e) => setField("category", e.target.value)} required />

          <input className={inputCls} placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setField("price", e.target.value)} />
          <input className={inputCls} placeholder="Actual Price (₹)" type="number" value={form.actualPrice} onChange={(e) => setField("actualPrice", e.target.value)} />

          <input className={inputCls} placeholder="Original Price (₹)" type="number" value={form.originalPrice} onChange={(e) => setField("originalPrice", e.target.value)} />
          <input className={inputCls} placeholder="Rating" type="number" step="0.1" value={form.rating} onChange={(e) => setField("rating", e.target.value)} />

          <input className={inputCls} placeholder="Sizes (comma separated)" value={form.sizes} onChange={(e) => setField("sizes", e.target.value)} />
          <input className={inputCls} placeholder="Colors (comma separated)" value={form.colors} onChange={(e) => setField("colors", e.target.value)} />

          <input className={inputCls} placeholder="Subcategory" value={form.subcategory} onChange={(e) => setField("subcategory", e.target.value)} />
          <input className={inputCls} placeholder="Stock" type="number" value={form.stock} onChange={(e) => setField("stock", e.target.value)} />

          <div className="flex items-center gap-3">
            <label htmlFor="featuredSwitch" className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`w-11 h-6 flex items-center rounded-full p-1 transition ${form.featured ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition ${form.featured ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
            </label>
            <input id="featuredSwitch" type="checkbox" className="sr-only" checked={Number(form.featured) === 1} onChange={(e) => setField("featured", e.target.checked ? 1 : 0)} />
          </div>

          <textarea className={textareaCls + " sm:col-span-2"} rows={4} placeholder="Description" value={form.description} onChange={(e) => setField("description", e.target.value)} />
        </div>

        {/* Images uploader */}
        <div className="mt-6">
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Product images</label>
          <div className="flex flex-wrap items-center gap-3">
            {(form.images || []).map((img) => (
              <div key={img} className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={img} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-7 h-7 grid place-items-center shadow"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}

            <label
              className="flex items-center justify-center w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500"
              title="Upload images"
            >
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
              <div className="text-center">
                <div className="text-2xl">＋</div>
                <div className="text-xs mt-1">{uploadingCount ? `${uploadingCount} uploading...` : "Upload"}</div>
              </div>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">You can upload multiple images. They will be saved as a comma-separated string to keep DB compatible with existing CSV/bulk upload.</p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" onClick={() => onClose && onClose()} className={btnSecondaryCls}>Cancel</button>
          <button type="submit" disabled={saving || uploadingCount > 0} className={btnPrimaryCls}>
            {saving ? "Saving..." : "Save product"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ======= ProductsAdmin main component (extended) ======= */
export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, sold: 0, inStock: 0, outOfStock: 0 });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("newest");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const [categories, setCategories] = useState([]);

  const DEBUG = false;

  const fetchProducts = useCallback(async () => {
    if (!showProducts) return;
    setLoading(true);
    try {
      const res = await api.get("/api/admin/products", { search: q, page, limit, sort: sortBy }, true);
      if (DEBUG) console.log("Products list raw:", res);
      const body = normalizeResponse(res);

      let list = [];
      let total = 0;
      if (Array.isArray(body)) {
        list = body;
      } else if (Array.isArray(body.data)) {
        list = body.data;
        total = Number(body.total ?? body.totalCount ?? 0);
      } else if (Array.isArray(body.products)) {
        list = body.products;
        total = Number(body.total ?? body.totalCount ?? 0);
      } else {
        const arr = Object.values(body).find((v) => Array.isArray(v));
        if (arr) list = arr;
      }

      setProducts(list || []);
      setTotalPages(limit === 999999 ? 1 : Math.max(1, Math.ceil((total || list.length || 0) / (limit || 20))));
    } catch (err) {
      console.error("Fetch products error:", err);
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [q, page, limit, sortBy, showProducts, DEBUG]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/api/admin/stats", {}, true);
      if (DEBUG) console.log("Stats raw:", res);
      const body = normalizeResponse(res);

      const total = Number(body.total ?? body.totalProducts ?? 0);
      const sold = Number(body.sold ?? body.soldProducts ?? 0);
      const inStock = Number(body.inStock ?? body.in_stock ?? 0);
      const outOfStock = Number(body.outOfStock ?? body.out_of_stock ?? 0);

      setStats({ total, sold, inStock, outOfStock });
    } catch (err) {
      console.error("Fetch stats error:", err);
      setStats({ total: 0, sold: 0, inStock: 0, outOfStock: 0 });
    }
  };

  /* ======= Category API helpers ======= */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/categories", {}, true);
      const body = normalizeResponse(res);
      // API might return {data: [...]} or array directly
      const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : body.categories ?? [];
      // normalize fields: ensure id, category, subcategory/name, parent_id, status, sort_order
      const norm = (list || []).map((c) => ({
        id: c.id ?? c._id ?? c.category_id ?? c.id,
        category: c.category ?? c.category_name ?? c.main_category ?? c.category,
        subcategory: c.subcategory ?? c.name ?? c.label ?? c.subcategory,
        parent_id: c.parent_id ?? c.parentId ?? c.parent || null,
        status: c.status ?? "active",
        sort_order: c.sort_order ?? c.order ?? 0,
        slug: c.slug ?? c.slug,
        metadata: c.metadata ?? c.metadata,
        description: c.description ?? c.description,
        raw: c,
      }));

      setCategories(norm);
    } catch (err) {
      console.error("Fetch categories error:", err);
      setCategories([]);
    }
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { if (!showProducts) return; setPage(1); }, [q, limit, sortBy, showProducts]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (showProducts) fetchStats(); }, [showProducts]);

  // Fetch categories when management toggled on
  useEffect(() => { if (showCategories) fetchCategories(); }, [showCategories, fetchCategories]);

  const openEditor = async (p) => {
    if (!p?.id) return;
    try {
      const res = await api.get(`/api/admin/products/${p.id}`, {}, true);
      const body = normalizeResponse(res);
      const prod = body?.data && typeof body.data === "object" ? body.data : body;
      setEditing(prod);
      setShowForm(true);
    } catch (err) {
      console.error("Failed to fetch product for edit:", err);
      alert("Failed to load product for editing. See console.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete product? This cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/products/${id}`, true);
      await Promise.all([fetchProducts(), fetchStats()]);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete product. See console.");
    }
  };

  const handleSave = async () => {
    await Promise.all([fetchProducts(), fetchStats()]);
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Products", value: stats.total, icon: Package, color: "bg-purple-500" },
          { label: "Sold Products", value: stats.sold, icon: ShoppingCart, color: "bg-green-500" },
          { label: "In Stock", value: stats.inStock, icon: CheckCircle, color: "bg-blue-500" },
          { label: "Out of Stock", value: stats.outOfStock, icon: XCircle, color: "bg-red-500" }
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.06 }} className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm hover:scale-[1.02] transition">
          <Plus className="w-4 h-4" /> Add Product
        </button>

        <button onClick={() => setShowBulk((s) => !s)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <Upload className="w-4 h-4" /> Bulk Upload
        </button>

        <div className="inline-flex items-center gap-2">
          <button onClick={() => setShowProducts((s) => !s)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-sm">
            <Eye className="w-4 h-4" /> {showProducts ? "Hide Products" : "Browse Products"}
          </button>

          {/* NEW: Category management toggle beside Browse Products */}
          <button onClick={() => setShowCategories((s) => !s)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${showCategories ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-gray-200 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"}`}>
            <Layers className="w-4 h-4" /> {showCategories ? "Hide Categories" : "Manage Categories"}
          </button>
        </div>
      </div>

      {/* Bulk Upload */}
      {showBulk && (
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <BulkUpload onUploadComplete={handleSave} />
        </div>
      )}

      {/* Category Management */}
      {showCategories && (
        <CategoryManagement categories={categories} setCategories={setCategories} onRefresh={fetchCategories} />
      )}

      {/* Products */}
      {showProducts && (
        <div className="space-y-6">
          {/* Search & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            </div>

            <div className="flex items-center gap-3">
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s} per page</option>)}
                <option value={999999}>Show All</option>
              </select>

              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="best_selling">Best Selling</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="low_stock">Low Stock</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">No products found</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => {
                const priceNum = Number(p.price ?? 0);
                const actualNum = Number(p.actualPrice ?? 0);
                const displayPrice = actualNum > 0 ? actualNum : priceNum;
                const showOriginal = Number(p.originalPrice ?? 0) > 0 && Number(p.originalPrice) > displayPrice;
                const firstImage = p.images ? String(p.images).split(",")[0] : "/images/placeholder.jpg";

                return (
                  <div key={p.id} className={cardCls}>
                    <div className="h-44 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
                      <img src={firstImage || "/images/placeholder.jpg"} alt={p.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="mt-3 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{p.category} {p.subcategory ? `/ ${p.subcategory}` : ""}</p>

                        <div className="mt-2 font-semibold text-gray-900 dark:text-white flex items-baseline gap-3">
                          <span>₹{displayPrice.toLocaleString()}</span>
                          {showOriginal && <span className="text-sm line-through text-gray-400">₹{Number(p.originalPrice).toLocaleString()}</span>}
                          {typeof p.sold !== "undefined" && <span className="text-xs text-gray-500 dark:text-gray-400">• {p.sold} sold</span>}
                          {Number(p.featured) === 1 && <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Featured</span>}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button onClick={() => openEditor(p)} className="p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Edit className="w-4 h-4 text-gray-900 dark:text-white" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && limit !== 999999 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Prev</button>
              <span className="text-gray-700 dark:text-gray-300">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {showForm && (
        <ProductFormModal
          product={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
