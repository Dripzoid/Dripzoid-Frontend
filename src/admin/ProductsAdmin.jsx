// src/pages/ProductsAdmin.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import BulkUpload from "./BulkUpload";
import {
  Plus, Upload, Eye, Search, Edit, Trash2, Package, ShoppingCart, CheckCircle, XCircle
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * ProductFormModal
 * - Carefully syncs form state when `product` changes (fixes empty-fields-after-edit bug)
 * - Submits all schema fields including actualPrice and featured
 */
function ProductFormModal({ product, onClose, onSave }) {
  const defaultForm = {
    name: "",
    category: "",
    price: 0,
    actualPrice: 0,
    images: "",
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

  // IMPORTANT: sync local form state whenever `product` prop changes
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? "",
        category: product.category ?? "",
        price: Number(product.price ?? 0),
        // prefer actualPrice but fallback to price for nice UX
        actualPrice: Number(product.actualPrice ?? product.price ?? 0),
        images: product.images ?? "",
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

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // ensure numbers are typed correctly
      const payload = {
        name: (form.name || "").toString().trim(),
        category: (form.category || "").toString().trim(),
        price: Number(form.price) || 0,
        actualPrice: Number(form.actualPrice) || 0,
        images: (form.images || "").toString(),
        rating: Number(form.rating) || 0,
        sizes: (form.sizes || "").toString(),
        colors: (form.colors || "").toString(),
        originalPrice: Number(form.originalPrice) || 0,
        description: (form.description || "").toString(),
        subcategory: (form.subcategory || "").toString(),
        stock: Number(form.stock) || 0,
        featured: Number(form.featured) ? 1 : 0,
      };

      // UX: if actualPrice is zero / not provided, default to price so re-open shows value
      if (!payload.actualPrice) payload.actualPrice = payload.price;

      let resp;
      if (product && product.id) {
        resp = await api.put(`/api/admin/products/${product.id}`, payload, true);
      } else {
        resp = await api.post(`/api/admin/products`, payload, true);
      }

      // let parent refresh lists & close modal
      if (typeof onSave === "function") await onSave(resp);
      else if (typeof onClose === "function") onClose();
    } catch (err) {
      console.error("Product save error:", err);
      alert("Failed to save product. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose && onClose()} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg p-6 z-10 shadow-lg overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{product ? "Edit Product" : "Add Product"}</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onClose && onClose()} className="px-3 py-1 rounded-lg border">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Name" className="p-2 rounded border" />
          <input value={form.category} onChange={(e) => setField("category", e.target.value)} placeholder="Category" className="p-2 rounded border" />

          <input type="number" value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="Price (₹)" className="p-2 rounded border" />
          <input type="number" value={form.actualPrice} onChange={(e) => setField("actualPrice", e.target.value)} placeholder="Actual Price (₹)" className="p-2 rounded border" />

          <input value={form.images} onChange={(e) => setField("images", e.target.value)} placeholder="Images (comma separated URLs)" className="p-2 rounded border col-span-1 sm:col-span-2" />

          <input type="number" value={form.originalPrice} onChange={(e) => setField("originalPrice", e.target.value)} placeholder="Original Price (₹)" className="p-2 rounded border" />
          <input type="number" value={form.rating} onChange={(e) => setField("rating", e.target.value)} placeholder="Rating" className="p-2 rounded border" />

          <input value={form.sizes} onChange={(e) => setField("sizes", e.target.value)} placeholder="Sizes (comma separated)" className="p-2 rounded border" />
          <input value={form.colors} onChange={(e) => setField("colors", e.target.value)} placeholder="Colors (comma separated)" className="p-2 rounded border" />

          <input value={form.subcategory} onChange={(e) => setField("subcategory", e.target.value)} placeholder="Subcategory" className="p-2 rounded border" />
          <input type="number" value={form.stock} onChange={(e) => setField("stock", e.target.value)} placeholder="Stock" className="p-2 rounded border" />

          <div className="flex items-center gap-2">
            <input id="featured" type="checkbox" checked={Number(form.featured) === 1} onChange={(e) => setField("featured", e.target.checked ? 1 : 0)} />
            <label htmlFor="featured">Featured</label>
          </div>

          <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Description" className="p-2 rounded border col-span-1 sm:col-span-2" rows={4} />
        </div>

        <div className="flex items-center justify-end gap-3 mt-4">
          <button type="button" onClick={() => onClose && onClose()} className="px-4 py-2 rounded border">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Product"}</button>
        </div>
      </form>
    </div>
  );
}

/**
 * ProductsAdmin (updated)
 * - Displays actualPrice / originalPrice correctly
 * - Passes full product object to editor
 */
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

  const DEBUG = false; // toggle logs

  const normalizeResponse = (res) => {
    if (!res) return {};
    if (res.data && typeof res.data === "object") {
      if (res.data.data || typeof res.data.total !== "undefined") return res.data;
      return res.data;
    }
    return res;
  };

  const fetchProducts = async () => {
    if (!showProducts) return;
    setLoading(true);
    try {
      const res = await api.get("/api/admin/products", { search: q, page, limit, sort: sortBy }, true);
      if (DEBUG) console.log("Products API raw response:", res);

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
        const arrVal = Object.values(body).find((v) => Array.isArray(v));
        if (arrVal) list = arrVal;
      }

      setProducts(list || []);
      setTotalPages(limit === 999999 ? 1 : Math.max(1, Math.ceil((total || list.length || 0) / (limit || 20))));
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/api/admin/stats", {}, true);
      if (DEBUG) console.log("Stats API raw response:", res);
      const body = normalizeResponse(res);

      const total = Number(body.total ?? body.totalProducts ?? 0);
      const sold = Number(body.sold ?? body.soldProducts ?? 0);
      const inStock = Number(body.inStock ?? body.in_stock ?? 0);
      const outOfStock = Number(body.outOfStock ?? body.out_of_stock ?? 0);

      setStats({ total, sold, inStock, outOfStock });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({ total: 0, sold: 0, inStock: 0, outOfStock: 0 });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/api/admin/products/${id}`, true);
      await Promise.all([fetchProducts(), fetchStats()]);
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Could not delete product. Check console for details.");
    }
  };

  const handleSave = async () => {
    await Promise.all([fetchProducts(), fetchStats()]);
    setEditing(null);
    setShowForm(false);
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (!showProducts) return;
    setPage(1);
  }, [q, limit, sortBy, showProducts]);

  useEffect(() => { fetchProducts(); /* eslint-disable-line */ }, [q, page, limit, sortBy, showProducts]);

  useEffect(() => { if (showProducts) fetchStats(); }, [showProducts]);

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
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.1 }} className="p-5 rounded-xl bg-white dark:bg-gray-900 shadow hover:shadow-lg transition">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.color} text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-3 bg-black text-white dark:bg-white dark:text-black rounded-lg shadow hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" /> Add Product
        </button>
        <button onClick={() => setShowBulk(!showBulk)} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-lg shadow hover:scale-105 transition-transform">
          <Upload className="w-5 h-5" /> Bulk Upload
        </button>
        <button onClick={() => setShowProducts(!showProducts)} className="flex items-center gap-2 px-5 py-3 bg-black text-white dark:bg-white dark:text-black rounded-lg shadow hover:scale-105 transition-transform">
          <Eye className="w-5 h-5" /> {showProducts ? "Hide Products" : "Browse Products"}
        </button>
      </div>

      {/* Bulk Upload */}
      {showBulk && (
        <div className="p-6 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
          <BulkUpload onUploadComplete={handleSave} />
        </div>
      )}

      {/* Products */}
      {showProducts && (
        <div className="space-y-6">
          {/* Search & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white" />
            </div>

            <div className="flex items-center gap-3">
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="w-40 pl-3 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white">
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
                <option value={999999}>Show All</option>
              </select>

              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="w-52 pl-3 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white">
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="best_selling">Best Selling</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="low_stock">Low Stock</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
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

                return (
                  <div key={p.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-black shadow hover:shadow-lg transition">
                    <img src={p.images?.split(",")[0] || "/images/placeholder.jpg"} alt={p.name} className="h-40 w-full object-cover rounded-md" />
                    <div className="mt-3 flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black dark:text-white">{p.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{p.category} {p.subcategory ? `/ ${p.subcategory}` : ""}</p>
                        <div className="mt-2 font-bold text-black dark:text-white flex items-baseline gap-3">
                          <span>₹{displayPrice.toLocaleString()}</span>
                          {showOriginal && <span className="text-sm line-through text-gray-400">₹{Number(p.originalPrice).toLocaleString()}</span>}
                          {typeof p.sold !== "undefined" && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">• {p.sold} sold</span>
                          )}
                          {Number(p.featured) === 1 && (
                            <span className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">Featured</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                          <Edit className="w-4 h-4 text-black dark:text-white" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-600">
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800">Prev</button>
              <span className="text-gray-700 dark:text-gray-300">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Product Form Modal */}
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
