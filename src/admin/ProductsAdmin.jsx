// src/pages/ProductsAdmin.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Tag,
  PlusCircle,
  Save,
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

/* ======= Helpers ======= */
const normalizeResponse = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === "object") {
    if (res.data.data || typeof res.data.total !== "undefined") return res.data;
    return res.data;
  }
  return res;
};

const MAIN_CATEGORIES = ["Men", "Women", "Kids"];

/**
 * parseSizeStockFromProduct
 * Accepts many shapes a product might arrive in:
 * - product.size_stock (object or JSON string)
 * - product.sizeStock, stock_map, sizes_map
 * - product.sizes_data or product.sizes (array of {size,stock})
 * - "S:10,M:5" style strings
 * - fallback: distribute product.stock across product.sizes (string)
 *
 * Returns a plain object: { S: 10, M: 5 }
 */
const parseSizeStockFromProduct = (p) => {
  if (!p) return {};

  // 1) Common explicit fields (object or JSON string)
  const candidates = ["size_stock", "sizeStock", "stock_map", "stockMap", "sizes_map", "sizesMap", "size_stock_map"];
  for (const k of candidates) {
    if (typeof p[k] !== "undefined" && p[k] !== null && p[k] !== "") {
      const val = p[k];
      if (typeof val === "object" && !Array.isArray(val)) {
        return Object.fromEntries(Object.entries(val).map(([k2, v]) => [k2, Number(v || 0)]));
      }
      try {
        const parsed = JSON.parse(String(val));
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          return Object.fromEntries(Object.entries(parsed).map(([k2, v]) => [k2, Number(v || 0)]));
        }
      } catch (err) {
        // fallthrough to string parsing below
      }
      // also accept "S:10,M:5" style
      const obj = {};
      String(val)
        .split(/[,|;]+/)
        .map((x) => x.trim())
        .forEach((part) => {
          if (!part) return;
          const [size, qty] = part.split(/[:=]/).map((s) => (s ? s.trim() : s));
          if (size) obj[size] = Number(qty) || 0;
        });
      if (Object.keys(obj).length) return obj;
    }
  }

  // 2) If backend provided sizes as an array of objects (common after our update)
  // Possible keys: sizes_data, sizes (array of {size,stock}) or product.sizes (array)
  const arrCandidates = ["sizes_data", "sizes", "size_list", "sizeList"];
  for (const k of arrCandidates) {
    const v = p[k];
    if (Array.isArray(v) && v.length > 0) {
      const obj = {};
      v.forEach((it) => {
        // support both { size, stock } and { size: 'S', stock: 10 } or {size:'S', qty:10}
        if (typeof it === "object" && it !== null) {
          const size = it.size ?? it.name ?? it.label;
          const stock = Number(it.stock ?? it.qty ?? it.quantity ?? 0);
          if (size) obj[String(size).trim()] = stock;
        } else if (typeof it === "string") {
          // string like "S:10"
          const [sz, q] = it.split(/[:=]/).map((x) => x && x.trim());
          if (sz) obj[sz] = Number(q) || 0;
        }
      });
      if (Object.keys(obj).length) return obj;
    }
  }

  // 3) fallback: if product.sizes is a comma string and product.stock present -> distribute evenly
  if (p.sizes && (typeof p.sizes === "string" || Array.isArray(p.sizes))) {
    const sizesArr = Array.isArray(p.sizes)
      ? p.sizes.map((s) => (typeof s === "object" ? s.size ?? String(s) : String(s))).map((s) => s.trim()).filter(Boolean)
      : String(p.sizes).split(",").map((s) => s.trim()).filter(Boolean);

    if (sizesArr.length > 0) {
      // if there's a separate size->stock mapping in product (rare), prefer that
      // otherwise distribute from total stock
      const explicit = {};
      // check for same-length array in p.sizes_data or p.size_stock
      if (Array.isArray(p.sizes_data) && p.sizes_data.length > 0) {
        p.sizes_data.forEach((s) => {
          if (typeof s === "object") explicit[s.size] = Number(s.stock || 0);
        });
      }
      if (Object.keys(explicit).length === sizesArr.length) {
        return sizesArr.reduce((acc, s) => ({ ...acc, [s]: Number(explicit[s] || 0) }), {});
      }

      const total = Number(p.stock || 0);
      if (!Number.isNaN(total) && total > 0) {
        const base = Math.floor(total / sizesArr.length);
        const map = {};
        sizesArr.forEach((s, i) => {
          map[s] = base + (i === sizesArr.length - 1 ? total - base * sizesArr.length : 0);
        });
        return map;
      }
    }
  }

  return {};
};

const sumSizeStock = (map) => Object.values(map || {}).reduce((s, v) => s + Number(v || 0), 0);

/* ======= CategoryFormModal (unchanged) ======= */
function CategoryFormModal({ editing, fixedCategory = null, categories = [], onClose, onSave }) {
  const defaultForm = {
    id: null,
    category: "Men",
    subcategory: "",
    slug: "",
    parent_id: null,
    status: "active",
    sort_order: 0,
    metadata: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing && typeof editing === "object" && Object.keys(editing).length > 0) {
      setForm({
        id: editing.id ?? null,
        category: editing.category ?? fixedCategory ?? "Men",
        subcategory: editing.subcategory ?? "",
        slug: editing.slug ?? "",
        parent_id: editing.parent_id ?? null,
        status: editing.status ?? "active",
        sort_order: Number(editing.sort_order ?? 0),
        metadata:
          editing.metadata && typeof editing.metadata === "string"
            ? editing.metadata
            : editing.metadata
            ? JSON.stringify(editing.metadata)
            : "",
      });
    } else {
      setForm((f) => ({ ...defaultForm, category: fixedCategory ?? defaultForm.category }));
    }
  }, [editing, fixedCategory]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        subcategory: form.subcategory,
        slug: form.slug || undefined,
        parent_id: form.parent_id ?? null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
        metadata: form.metadata ? JSON.parse(form.metadata) : null,
      };

      let res;
      if (form.id) {
        res = await api.put(`/api/admin/products/categories/${form.id}`, payload, true);
      } else {
        res = await api.post("/api/admin/products/categories", payload, true);
      }

      if (typeof onSave === "function") {
        await onSave(normalizeResponse(res));
      }
      onClose && onClose();
    } catch (err) {
      console.error("Save category error:", err);
      alert("Failed to save category. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = (categories || [])
    .filter((c) => (c.category || c.category_name) === form.category && !c.parent_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl overflow-auto max-h-[92vh] border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{form.id ? "Edit Subcategory" : "Add Subcategory"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create or update subcategories (Men / Women / Kids).</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onClose && onClose()} className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700">
              Close
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-black text-white dark:bg-white dark:text-black">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder="Subcategory name"
            value={form.subcategory}
            onChange={(e) => setField("subcategory", e.target.value)}
            required
          />

          {/* Category selector - lock when opened from a section add button */}
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => setField("category", e.target.value)}
            disabled={!!fixedCategory && !form.id}
          >
            {MAIN_CATEGORIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input className={inputCls} placeholder="Slug (optional)" value={form.slug} onChange={(e) => setField("slug", e.target.value)} />

          <select
            className={inputCls}
            value={form.parent_id ?? ""}
            onChange={(e) => setField("parent_id", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">No parent</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.subcategory}
              </option>
            ))}
          </select>

          <select className={inputCls} value={form.status} onChange={(e) => setField("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input className={inputCls} placeholder="Sort order" type="number" value={form.sort_order} onChange={(e) => setField("sort_order", e.target.value)} />

          <textarea
            className={textareaCls + " sm:col-span-2"}
            placeholder='Metadata JSON (e.g. {"icon":"shirt.png"})'
            value={form.metadata}
            onChange={(e) => setField("metadata", e.target.value)}
            rows={4}
          />
        </div>
      </form>
    </div>
  );
}

/* ======= CategoryManagement Panel (unchanged) ======= */
// ... (keep CategoryManagement exactly as in your file above)
// For brevity in this message I will not duplicate CategoryManagement here — keep your existing implementation.
// The important changes are in ProductFormModal and parsing helpers.

/* ======= ProductFormModal (updated to use per-size stock mapping) ======= */
function ProductFormModal({ product, onClose, onSave, categories = [] }) {
  const defaultForm = {
    name: "",
    category: "Men",
    price: "",
    actualPrice: "",
    images: [],
    rating: "",
    sizes: "",
    colors: "",
    originalPrice: "",
    description: "",
    subcategory: "",
    stock: "",
    featured: 0,
  };

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [useCustomSub, setUseCustomSub] = useState(false);
  const [sizeStocks, setSizeStocks] = useState({}); // { S: 10, M: 5 }

  useEffect(() => {
    if (product && typeof product === "object" && Object.keys(product).length > 0) {
      // product.sizes might be:
      // - a comma string "S,M,L"
      // - an array [{size,stock}, ...] (backend)
      // - or undefined
      let parsedSizesStr = "";
      if (Array.isArray(product.sizes)) {
        parsedSizesStr = product.sizes.map((s) => (typeof s === "object" ? s.size : String(s))).join(",");
      } else if (typeof product.sizes === "string") {
        parsedSizesStr = product.sizes;
      } else if (Array.isArray(product.sizes_data)) {
        parsedSizesStr = product.sizes_data.map((s) => (s && s.size ? s.size : "")).filter(Boolean).join(",");
      } else if (Array.isArray(product.sizes_data || product.sizes)) {
        // extra safety
        parsedSizesStr = (product.sizes_data || product.sizes).map((s) => (typeof s === "object" ? s.size : String(s))).join(",");
      } else {
        parsedSizesStr = String(product.sizes ?? "");
      }

      const parsedImages = product.images ? String(product.images).split(",").filter(Boolean) : [];
      const parsedSizeStocks = parseSizeStockFromProduct(product);
      const computedStock = sumSizeStock(parsedSizeStocks) || Number(product.stock || 0);

      setForm({
        name: product.name ?? "",
        category: product.category ?? "Men",
        price: Number(product.price ?? 0),
        actualPrice: Number(product.actualPrice ?? product.price ?? 0),
        images: parsedImages,
        rating: Number(product.rating ?? 0),
        sizes: parsedSizesStr,
        colors: product.colors ?? "",
        originalPrice: Number(product.originalPrice ?? 0),
        description: product.description ?? "",
        subcategory: product.subcategory ?? "",
        stock: Number(computedStock || 0),
        featured: Number(product.featured ?? 0),
      });
      setSizeStocks(parsedSizeStocks || {});
      setUseCustomSub(false);
    } else {
      setForm(defaultForm);
      setSizeStocks({});
      setUseCustomSub(false);
    }
  }, [product]);

  // Clear subcategory when main category changes (avoid stale selection)
  useEffect(() => {
    setField("subcategory", "");
    setUseCustomSub(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
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

  // When the sizes string changes, adjust the sizeStocks map
  useEffect(() => {
    const sizesArr = String(form.sizes || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (sizesArr.length === 0) {
      setSizeStocks({});
      return;
    }

    setSizeStocks((prev) => {
      const next = {};
      const prevKeys = Object.keys(prev || {});
      const totalPrev = sumSizeStock(prev);

      // If prev already has values and the same sizes, keep values
      sizesArr.forEach((sz, idx) => {
        if (prev && typeof prev[sz] !== "undefined") next[sz] = Number(prev[sz]);
        else if (prevKeys.length === sizesArr.length && prevKeys[idx]) next[sz] = Number(prev[prevKeys[idx]] || 0);
        else {
          // distribute evenly from existing total if possible
          const base = prevKeys.length ? Math.floor(totalPrev / sizesArr.length) : Math.floor(Number(form.stock || 0) / sizesArr.length);
          next[sz] = base;
        }
      });

      // ensure sum equals form.stock if possible by adjusting last size
      const desiredTotal = Number(form.stock || 0);
      const currentTotal = sumSizeStock(next);
      if (desiredTotal > 0 && currentTotal !== desiredTotal) {
        const last = sizesArr[sizesArr.length - 1];
        next[last] = (next[last] || 0) + (desiredTotal - currentTotal);
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sizes]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);

    try {
      // If user is in custom subcategory mode and typed something, ensure subcategory exists (create or reuse)
      let chosenSub = form.subcategory ? String(form.subcategory).trim() : "";

      if (useCustomSub && chosenSub) {
        const exists = (categories || []).find((c) => {
          const catName = (c.category || c.category_name || "").toString();
          const subName = (c.subcategory || c.name || "").toString();
          return (
            catName === form.category &&
            subName.toLowerCase() === chosenSub.toLowerCase()
          );
        });

        if (exists) {
          chosenSub = exists.subcategory || exists.name || chosenSub;
        } else {
          try {
            const createRes = await api.post(
              "/api/admin/products/categories",
              { category: form.category, subcategory: chosenSub, parent_id: null, status: "active", sort_order: 0 },
              true
            );
            const created = normalizeResponse(createRes);
            const createdObj = created && typeof created === "object" && (created.subcategory || created.data) ? (created.subcategory ? created : created.data ?? created) : created;
            if (createdObj && (createdObj.subcategory || createdObj.name)) {
              chosenSub = createdObj.subcategory ?? createdObj.name ?? chosenSub;
            }
          } catch (err) {
            console.warn("Failed to create subcategory; proceeding with typed name.", err);
          }
        }
      }

      // Ensure sizes string is normalized
      const sizesNormalized = String(form.sizes || "").split(",").map((s) => s.trim()).filter(Boolean).join(",");

      // finalize sizeStocks and total stock
      const finalSizeStocks = { ...sizeStocks };
      const totalStock = sumSizeStock(finalSizeStocks) || Number(form.stock || 0);

      // payload: keep backward-compatible 'stock' (total) and also include size_stock JSON mapping
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        actualPrice: Number(form.actualPrice) || Number(form.price) || 0,
        originalPrice: Number(form.originalPrice) || 0,
        rating: Number(form.rating) || 0,
        stock: Number(totalStock) || 0,
        featured: Number(form.featured) ? 1 : 0,
        images: (form.images || []).join(","),
        subcategory: chosenSub || form.subcategory || "",
        sizes: sizesNormalized,
        size_stock: JSON.stringify(finalSizeStocks),
      };

      let resp;
      if (product && product.id) {
        resp = await api.put(`/api/admin/products/${product.id}`, payload, true);
      } else {
        resp = await api.post(`/api/admin/products`, payload, true);
      }

      if (typeof onSave === "function") {
        await onSave(normalizeResponse(resp));
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

  // available subcategories for selected main category (top-level only)
  const availableSubcats = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return categories
      .filter((c) => (c.category || c.category_name) === (form.category || "Men") && !c.parent_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [categories, form.category]);

  useEffect(() => {
    if (form.subcategory === "__custom__") {
      setUseCustomSub(true);
      setField("subcategory", "");
    }
  }, [form.subcategory]);

  // helpers for UI
  const sizesArray = useMemo(() => String(form.sizes || "").split(",").map((s) => s.trim()).filter(Boolean), [form.sizes]);

  const autoDistribute = () => {
    const total = Number(form.stock || 0) || sumSizeStock(sizeStocks);
    const sizes = sizesArray;
    if (sizes.length === 0) return;
    const base = Math.floor(total / sizes.length);
    const next = {};
    sizes.forEach((s, i) => {
      next[s] = base + (i === sizes.length - 1 ? total - base * sizes.length : 0);
    });
    setSizeStocks(next);
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
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{product ? "Edit Product" : "Add Product"}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fill product details. Images are uploaded to your configured upload route.</p>
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

          <select className={inputCls} value={form.category} onChange={(e) => setField("category", e.target.value)}>
            {MAIN_CATEGORIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input className={inputCls} placeholder="Price (₹)" type="number" value={form.price} onChange={(e) => setField("price", e.target.value)} />
          <input className={inputCls} placeholder="Actual Price (₹)" type="number" value={form.actualPrice} onChange={(e) => setField("actualPrice", e.target.value)} />

          <input className={inputCls} placeholder="Original Price (₹)" type="number" value={form.originalPrice} onChange={(e) => setField("originalPrice", e.target.value)} />
          <input className={inputCls} placeholder="Rating" type="number" step="0.1" value={form.rating} onChange={(e) => setField("rating", e.target.value)} />

          <input className={inputCls} placeholder="Sizes (comma separated)" value={form.sizes} onChange={(e) => setField("sizes", e.target.value)} />
          <input className={inputCls} placeholder="Colors (comma separated)" value={form.colors} onChange={(e) => setField("colors", e.target.value)} />

          {/* Subcategory: prefer select from DB but allow custom */}
          {availableSubcats.length > 0 && !useCustomSub ? (
            <div className="flex gap-2 items-center">
              <select
                className={inputCls + " flex-1"}
                value={form.subcategory}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__custom__") {
                    setUseCustomSub(true);
                    setField("subcategory", "");
                  } else {
                    setField("subcategory", val);
                  }
                }}
              >
                <option value="">-- Select Subcategory --</option>
                {availableSubcats.map((s) => (
                  <option key={s.id} value={s.subcategory}>
                    {s.subcategory}
                  </option>
                ))}
                <option value="__custom__">Other (Custom)</option>
              </select>
              <button type="button" onClick={() => setUseCustomSub(true)} className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                Custom
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input className={inputCls + " flex-1"} placeholder="Subcategory (Custom)" value={form.subcategory} onChange={(e) => setField("subcategory", e.target.value)} />
              <button
                type="button"
                onClick={() => {
                  setUseCustomSub(false);
                  setField("subcategory", "");
                }}
                className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700"
              >
                Choose
              </button>
            </div>
          )}

          {/* Stock controls: total and per-size mapping */}
          <div className="flex items-center gap-2">
            <input className={inputCls} placeholder="Total stock (will sum per-size)" type="number" value={form.stock} onChange={(e) => setField("stock", Number(e.target.value))} />
            <button type="button" onClick={autoDistribute} className="px-3 py-2 rounded border border-gray-200 dark:border-gray-700">Auto distribute</button>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Per-size stock</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sizesArray.length === 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Define sizes above (e.g. S,M,L) to set per-size stock</div>
              ) : (
                sizesArray.map((sz) => (
                  <div key={sz} className="flex items-center gap-2">
                    <div className="w-16 text-sm text-gray-700 dark:text-gray-300">{sz}</div>
                    <input
                      type="number"
                      className={inputCls + " flex-1"}
                      value={Number(sizeStocks[sz] ?? 0)}
                      onChange={(e) => setSizeStocks((s) => ({ ...s, [sz]: Number(e.target.value) || 0 }))}
                    />
                  </div>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">The UI will submit a <code>size_stock</code> JSON object (e.g. {"{"}"S":10,"M":15{"}"}) along with a backward-compatible <code>stock</code> total.</p>
          </div>

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
          <button type="button" onClick={() => onClose && onClose()} className={btnSecondaryCls}>
            Cancel
          </button>
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

  const mapSortForBackend = (uiSort) => {
    const map = {
      newest: "newest",
      price_asc: "price_asc",
      price_desc: "price_desc",
      best_selling: "best_selling",
      out_of_stock: "out_of_stock",
      low_stock: "low_stock",
    };
    return map[uiSort] ?? uiSort;
  };

  const fetchProducts = useCallback(
    async () => {
      if (!showProducts) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q && String(q).trim() !== "") params.append("search", String(q).trim());
        if (page && Number(page) > 0) params.append("page", String(Number(page)));
        if (limit && Number(limit) > 0) params.append("limit", String(Number(limit)));
        const backendSort = mapSortForBackend(sortBy);
        if (backendSort) params.append("sort", String(backendSort));

        const queryString = params.toString();
        const url = queryString ? `/api/admin/products?${queryString}` : `/api/admin/products`;

        if (DEBUG) console.log("Fetching products URL:", url);

        const res = await api.get(url, {}, true);
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

        // normalize each product: parse size_stock mappings if present and compute totalStock
        const normList = (list || []).map((p) => {
          const sizeStock = parseSizeStockFromProduct(p);
          const totalStock = sumSizeStock(sizeStock) || Number(p.stock || 0);
          return { ...p, sizeStock, totalStock };
        });

        setProducts(normList || []);
        setTotalPages(limit === 999999 ? 1 : Math.max(1, Math.ceil((total || normList.length || 0) / (limit || 20))));
      } catch (err) {
        console.error("Fetch products error:", err);
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [q, page, limit, sortBy, showProducts, DEBUG]
  );

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/stats", {}, true);
      if (DEBUG) console.log("Stats raw:", res);
      const body = normalizeResponse(res);

      const total = Number((body.total ?? body.totalProducts) ?? 0);
      const sold = Number((body.sold ?? body.soldProducts) ?? 0);
      const inStock = Number((body.inStock ?? body.in_stock) ?? 0);
      const outOfStock = Number((body.outOfStock ?? body.out_of_stock) ?? 0);

      setStats({ total, sold, inStock, outOfStock });
    } catch (err) {
      console.error("Fetch stats error:", err);
      setStats({ total: 0, sold: 0, inStock: 0, outOfStock: 0 });
    }
  }, [DEBUG]);

  /* ======= Category API helpers ======= */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/products/categories", {}, true);
      const body = normalizeResponse(res);
      const list = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : body.categories ?? [];
      const norm = (list || []).map((c) => ({
        id: c.id ?? c._id ?? c.category_id ?? c.id,
        category: c.category ?? c.category_name ?? c.main_category ?? c.category,
        subcategory: c.subcategory ?? c.name ?? c.label ?? c.subcategory,
        parent_id: c.parent_id ?? c.parentId ?? c.parent ?? null,
        status: c.status ?? "active",
        sort_order: c.sort_order ?? c.order ?? 0,
        slug: c.slug ?? null,
        metadata: c.metadata ?? null,
        description: c.description ?? null,
        raw: c,
      }));

      setCategories(norm);
    } catch (err) {
      console.error("Fetch categories error:", err);
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCategories, fetchStats]);

  useEffect(() => {
    if (!showProducts) return;
    setPage(1);
  }, [q, limit, sortBy, showProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (showProducts) fetchStats();
  }, [showProducts, fetchStats]);

  useEffect(() => {
    if (showCategories) fetchCategories();
  }, [showCategories, fetchCategories]);

  const openEditor = async (p) => {
    if (!p?.id) return;
    try {
      const res = await api.get(`/api/admin/products/${p.id}`, {}, true);
      const body = normalizeResponse(res);
      const prod = body?.data && typeof body.data === "object" ? body.data : body;
      // ensure we include parsed sizeStock for the edit form
      const sizeStock = parseSizeStockFromProduct(prod);
      const totalStock = sumSizeStock(sizeStock) || Number(prod.stock || 0);
      const parsedProd = { ...prod, sizeStock, stock: totalStock };
      setEditing(parsedProd);
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
    await Promise.all([fetchProducts(), fetchStats(), fetchCategories()]);
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
          { label: "Out of Stock", value: stats.outOfStock, icon: XCircle, color: "bg-red-500" },
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

          {/* Category management toggle beside Browse Products */}
          <button onClick={() => setShowCategories((s) => !s)} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${showCategories ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-gray-200 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"}`}>
            <Layers className="w-4 h-4" /> {showCategories ? "Hide Categories" : "Manage Categories"}
          </button>
        </div>
      </div>

      {/* Bulk Upload */}
      {showBulk && (
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Pass a flag so BulkUpload can handle size_stock column or a size:qty format in CSV. You'll need to update BulkUpload to respect this key. */}
          <BulkUpload onUploadComplete={handleSave} expectSizeStock={true} />
        </div>
      )}

      {/* Category Management */}
      {showCategories && (
        <CategoryManagement categories={categories} onRefresh={fetchCategories} />
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
                const displayPrice = priceNum > 0 ? priceNum : actualNum;
                const showOriginal = Number(p.originalPrice ?? 0) > 0 && Number(p.originalPrice) > displayPrice;
                const firstImage = p.images ? String(p.images).split(",")[0] : "/images/placeholder.jpg";

                const totalStock = Number(p.totalStock ?? p.stock ?? 0);

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

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Stock: {totalStock}</div>
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
          categories={categories}
        />
      )}
    </div>
  );
}
