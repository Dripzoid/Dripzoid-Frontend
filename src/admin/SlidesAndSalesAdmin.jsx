import React, { useEffect, useRef, useState } from "react";

/**
 * SlidesAndSalesAdmin.jsx — Redesigned
 * - Modern black & white theme (light/dark aware)
 * - Drag-to-reorder slides (HTML5 drag & drop) with stacked visual like LinkedIn
 * - Smooth Tailwind animations/effects
 * - Sales product list: full-width vertical cards with image
 * - Fixed search input cursor issue by keeping the input stable and using stable keys
 * - Defensive networking and upload route /api/upload
 */

export default function SlidesAndSalesAdmin() {
  const API_BASE =
    (typeof process !== "undefined" && (process.env.REACT_APP_API_BASE || process.env.API_BASE)) ||
    (typeof window !== "undefined" && window.__API_BASE__) ||
    "https://api.dripzoid.com";

  function buildUrl(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) return path;
    const base = API_BASE.replace(/\/+$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return base ? `${base}${p}` : p;
  }

  const [mode, setMode] = useState("slides");

  // Slides
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);
  const fileInputRef = useRef(null);
  const dragOverIndexRef = useRef(null);

  // Sales
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [creatingSale, setCreatingSale] = useState(false);

  // Products
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productSort, setProductSort] = useState("relevance");
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // UI note
  const [note, setNote] = useState(null);

  // Styles helpers
  function primaryBtnClass(extra = "") {
    return `inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow-lg transition transform-gpu hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-black text-white dark:bg-white dark:text-black ${extra}`;
  }
  function secondaryBtnClass(extra = "") {
    return `inline-flex items-center gap-2 px-3 py-1 rounded-md font-medium transition border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 bg-transparent ${extra}`;
  }

  function setNoteWithAutoClear(n, timeout = 6000) {
    setNote(n);
    if (timeout) {
      setTimeout(() => setNote((cur) => (cur === n ? null : cur)), timeout);
    }
  }

  function getAuthHeaders(addJson = true) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (addJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  async function parseErrorResponse(res) {
    try {
      if (!res || typeof res.text !== "function") return String(res || "Unknown error");
      const ct = (res.headers && typeof res.headers.get === "function") ? (res.headers.get("content-type") || "") : "";
      const text = await res.text();
      if (ct.includes("application/json")) {
        try {
          const json = JSON.parse(text);
          return json.message || json.error || JSON.stringify(json);
        } catch {
          return text || `${res.status || "error"} ${res.statusText || ""}`;
        }
      }
      if (text && text.includes("<")) {
        const msgMatch = text.match(/<Message>([\s\S]*?)<\/*Message>/i);
        if (msgMatch && msgMatch[1]) return msgMatch[1].trim();
        return `Server returned XML error: ${text.slice(0, 240)}...`;
      }
      return text || `${res.status || "error"} ${res.statusText || ""}`;
    } catch {
      return `Network error or malformed error response`;
    }
  }

  async function safeFetchJson(url, opts = {}) {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (fetchErr) {
      throw new Error(`Network error: ${fetchErr.message || fetchErr}`);
    }

    if (!res.ok) {
      const parsed = await parseErrorResponse(res);
      throw new Error(parsed);
    }

    const ct = (res.headers && res.headers.get ? res.headers.get("content-type") : "") || "";
    if (ct.includes("application/json")) {
      try {
        return await res.json();
      } catch {
        const txt = await res.text().catch(() => "");
        return { data: txt };
      }
    }
    const txt = await res.text().catch(() => "");
    try {
      return JSON.parse(txt);
    } catch {
      return { data: txt };
    }
  }

  async function apiGet(path) {
    return safeFetchJson(buildUrl(path), { credentials: "include", headers: getAuthHeaders(false) });
  }
  async function apiPost(path, body, isFormData = false) {
    const url = buildUrl(path);
    const opts = { method: "POST", credentials: "include" };
    if (isFormData) {
      opts.body = body;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) opts.headers = { Authorization: `Bearer ${token}` };
    } else {
      opts.headers = getAuthHeaders(true);
      opts.body = JSON.stringify(body);
    }
    return safeFetchJson(url, opts);
  }
  async function apiPatch(path, body) {
    return safeFetchJson(buildUrl(path), { method: "PATCH", credentials: "include", headers: getAuthHeaders(true), body: JSON.stringify(body) });
  }
  async function apiDelete(path) {
    return safeFetchJson(buildUrl(path), { method: "DELETE", credentials: "include", headers: getAuthHeaders(false) });
  }

  // initial load
  useEffect(() => {
    (async () => {
      try {
        await loadSlides();
        await loadSales();
        await loadAllProducts();
      } catch (err) {
        console.error("initial load error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slides
  async function loadSlides() {
    setLoadingSlides(true);
    try {
      const data = await apiGet("/api/admin/slides");
      const arr = Array.isArray(data) ? data : data.slides || data.data || [];
      setSlides(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("loadSlides error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load slides — ${err.message || err}` }, 10000);
      setSlides([]);
    } finally {
      setLoadingSlides(false);
    }
  }

  async function handleDeleteSlide(id) {
    if (!window.confirm("Delete this slide?")) return;
    try {
      await apiDelete(`/api/admin/slides/${id}`);
      setSlides((s) => s.filter((x) => x?.id !== id));
      setNoteWithAutoClear({ type: "success", text: "Slide removed" }, 4000);
    } catch (err) {
      console.error("handleDeleteSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to remove slide — ${err.message || err}` }, 8000);
    }
  }

  // drag & drop handlers for the stacked slide view
  function onDragStartSlide(e, index) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    // add slight visual feedback
    try {
      e.dataTransfer.setDragImage(e.currentTarget, 40, 20);
    } catch {}
  }
  function onDragOverSlide(e, index) {
    e.preventDefault();
    dragOverIndexRef.current = index;
  }
  function onDropSlide(e, index) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    const to = index;
    if (Number.isNaN(from)) return;
    reorderSlides(from, to);
  }

  async function reorderSlides(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setSlides((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      if (fromIndex < 0 || fromIndex >= copy.length) return copy;
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      // optimistically update order and persist
      updateSlidesOrder(copy).catch((e) => console.error("reorder save failed", e));
      return copy;
    });
  }

  async function updateSlidesOrder(newOrder) {
    try {
      await apiPost("/api/admin/slides/reorder", { order: newOrder.map((s) => s?.id) });
      setNoteWithAutoClear({ type: "success", text: "Slides reordered" }, 3000);
    } catch (err) {
      console.error("updateSlidesOrder error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to save slide order — ${err.message || err}` }, 8000);
    }
  }

  async function uploadImage(file) {
    if (!file) throw new Error("No file provided");
    const fd = new FormData();
    fd.append("image", file);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch(buildUrl("/api/upload"), { method: "POST", body: fd, credentials: "include", headers });
      if (!res.ok) {
        const parsed = await parseErrorResponse(res);
        throw new Error(parsed);
      }
      const json = await res.json().catch(() => null);
      if (!json) throw new Error("Upload returned empty response");
      const url = json.url || json.secure_url || json.imageUrl || json.image_url || json.data?.url;
      if (!url) throw new Error("Upload succeeded but server returned no 'url' field.");
      return url;
    } catch (err) {
      console.error("uploadImage error:", err);
      throw err;
    }
  }

  async function handleAddSlide({ file, name, link }) {
    setAddingSlide(true);
    try {
      const url = await uploadImage(file);
      const saved = await apiPost("/api/admin/slides", { name, link, image_url: url });
      const newSlide = saved?.slide || (saved?.id ? { id: saved.id, name, link, image_url: url } : { id: Date.now(), name, link, image_url: url });
      setSlides((s) => [...(Array.isArray(s) ? s : []), newSlide]);
      setNoteWithAutoClear({ type: "success", text: "Slide added" }, 5000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("handleAddSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to add slide — ${err.message || err}` }, 10000);
    } finally {
      setAddingSlide(false);
    }
  }

  // Sales
  async function loadSales() {
    setLoadingSales(true);
    try {
      const data = await apiGet("/api/admin/sales");
      const arr = Array.isArray(data) ? data : data.sales || data.data || [];
      setSales(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("loadSales error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load sales — ${err.message || err}` }, 8000);
      setSales([]);
    } finally {
      setLoadingSales(false);
    }
  }

  async function handleCreateSale({ name }) {
    if (!name || selectedProductIds.size === 0) {
      setNoteWithAutoClear({ type: "error", text: "Please provide a name and select at least one product" }, 6000);
      return;
    }
    setCreatingSale(true);
    try {
      const payload = { name, productIds: Array.from(selectedProductIds) };
      const saved = await apiPost("/api/admin/sales", payload);
      const newSale = saved?.sale || (saved?.id ? { id: saved.id, name, productIds: payload.productIds, enabled: true } : { id: Date.now(), name, productIds: payload.productIds, enabled: true });
      setSales((s) => [...(Array.isArray(s) ? s : []), newSale]);
      setSelectedProductIds(new Set());
      setNoteWithAutoClear({ type: "success", text: "Sale created" }, 5000);
    } catch (err) {
      console.error("handleCreateSale error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to create sale — ${err.message || err}` }, 10000);
    } finally {
      setCreatingSale(false);
    }
  }

  async function toggleSaleEnabled(saleId) {
    try {
      const sale = sales.find((s) => s?.id === saleId);
      if (!sale) return;
      const updated = await apiPatch(`/api/admin/sales/${saleId}/toggle`, { enabled: !sale.enabled });
      setSales((list) => (Array.isArray(list) ? list.map((s) => (s?.id === saleId ? { ...s, enabled: updated?.enabled ?? !s.enabled } : s)) : list));
      setNoteWithAutoClear({ type: "success", text: "Sale updated" }, 4000);
    } catch (err) {
      console.error("toggleSaleEnabled error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to update sale — ${err.message || err}` }, 8000);
    }
  }

  // Products: load all once
  async function loadAllProducts() {
    setProductsLoading(true);
    try {
      const data = await apiGet("/api/admin/products");
      const arr = Array.isArray(data) ? data : data.products || data.data || [];
      const safeArr = Array.isArray(arr) ? arr : [];
      setAllProducts(safeArr);
      setProducts(safeArr);
    } catch (err) {
      console.error("loadAllProducts error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load products — ${err.message || err}` }, 8000);
      setAllProducts([]);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  // client-side filtering + sorting
  useEffect(() => {
    try {
      let list = Array.isArray(allProducts) ? [...allProducts] : [];
      const q = (productQuery || "").trim().toLowerCase();
      if (q) {
        list = list.filter((p) => {
          const name = (p?.name || "").toString().toLowerCase();
          const id = p?.id?.toString?.() || "";
          return name.includes(q) || id.includes(q);
        });
      }

      if (productSort === "priceAsc") list.sort((a, b) => (Number(a?.price || 0) - Number(b?.price || 0)));
      else if (productSort === "priceDesc") list.sort((a, b) => (Number(b?.price || 0) - Number(a?.price || 0)));
      else if (productSort === "newest") list.sort((a, b) => (new Date(b?.createdAt || b?.created || 0) - new Date(a?.createdAt || a?.created || 0)));
      setProducts(list);
    } catch (err) {
      console.error("filterProducts error:", err);
    }
  }, [productQuery, productSort, allProducts]);

  function toggleSelectProduct(product) {
    setSelectedProductIds((prev) => {
      const copy = new Set(prev);
      const id = product?.id;
      if (id == null) return copy;
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  // UI components
  function CenterToggle() {
    return (
      <div className="w-full flex justify-center my-6">
        <div className="inline-flex items-center rounded-full p-1 bg-neutral-100/40 dark:bg-neutral-900/40 shadow-inner border border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setMode("slides")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all ${mode === "slides" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-black/80 dark:text-white/80"}`}
          >
            Slides
          </button>
          <button
            onClick={() => setMode("sales")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all ${mode === "sales" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-black/80 dark:text-white/80"}`}
          >
            Sales
          </button>
        </div>
      </div>
    );
  }

  function Note() {
    if (!note) return null;
    return (
      <div role="status" className={`mb-4 px-4 py-2 rounded-lg max-w-3xl mx-auto text-sm ${note.type === "success" ? "bg-white/8 text-white border border-white/10" : "bg-red-900/30 text-red-200 border border-red-800/30"}`}>
        {note.text}
      </div>
    );
  }

  function SlideAddBox() {
    const [name, setName] = useState("");
    const [link, setLink] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
      if (!file) {
        setPreview(null);
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }, [file]);

    function onFile(e) {
      const f = e?.target?.files?.[0];
      if (f) setFile(f);
    }

    function clearAll() {
      setFile(null);
      setPreview(null);
      setName("");
      setLink("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
      <div className="p-4 rounded-2xl border border-white/8 bg-gradient-to-b from-black/40 to-black/25 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-64 h-36 border-2 border-dashed rounded-lg overflow-hidden flex items-center justify-center bg-white/5">
              {preview ? <img src={preview} alt="preview" className="object-cover w-full h-full" /> : <div className="text-center text-sm text-neutral-400">Preview</div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className={primaryBtnClass()}>
                Choose Image
              </button>
              <button onClick={clearAll} className={secondaryBtnClass()}>
                Clear
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase text-neutral-400">Slide name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Winter Collection" className="px-3 py-2 rounded-md border border-white/8 bg-black/20 focus:outline-none" />
            <label className="text-xs font-semibold uppercase text-neutral-400">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/collection/winter" className="px-3 py-2 rounded-md border border-white/8 bg-black/20 focus:outline-none" />

            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAddSlide({ file, name, link })} disabled={!file || addingSlide} className={primaryBtnClass(addingSlide ? "opacity-70 pointer-events-none" : "")}>
                {addingSlide ? "Adding..." : "Add Slide"}
              </button>
              <button onClick={clearAll} className={secondaryBtnClass()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stacked slide list with drag & drop
  function SlidesList() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Slides ({slides.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setSlides([])} title="Clear local view" className={secondaryBtnClass()}>
              Clear View
            </button>
            <button onClick={() => loadSlides().catch((e) => console.error("manual reload slides error:", e))} className={secondaryBtnClass()}>
              Reload
            </button>
          </div>
        </div>

        {loadingSlides ? (
          <div className="p-4 rounded-md border">Loading slides...</div>
        ) : (
          <div className="relative w-full h-[360px] max-w-3xl mx-auto">
            {/* We'll render a stacked pile — top item has highest z-index */}
            {slides.map((s, idx) => {
              const image = s?.image_url || s?.image || s?.imageUrl || s?.imageurl || "";
              const offset = idx * 14; // vertical offset per card
              const rotate = (idx % 2 === 0 ? -2 : 2) * ((idx % 4) === 0 ? 1 : 0.6); // subtle rotation
              return (
                <div
                  key={s?.id ?? idx}
                  draggable
                  onDragStart={(e) => onDragStartSlide(e, idx)}
                  onDragOver={(e) => onDragOverSlide(e, idx)}
                  onDrop={(e) => onDropSlide(e, idx)}
                  className={`absolute left-1/2 -translate-x-1/2 w-11/12 md:w-3/4 p-4 rounded-2xl overflow-hidden shadow-2xl border border-white/8 transform-gpu transition-all duration-300 hover:scale-[1.01] cursor-grab`}
                  style={{
                    top: `${offset}px`,
                    zIndex: 200 + idx,
                    transform: `translateX(-50%) translateY(0) rotate(${rotate}deg)`,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.25))",
                  }}
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-44 h-28 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                      {image ? (
                        <img src={image} alt={s?.name || "slide"} className="object-cover w-full h-full" />
                      ) : (
                        <div className="text-sm text-neutral-400">No image</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold">{s?.name || "Untitled"}</div>
                          <div className="text-sm text-neutral-400 mt-1">{s?.link || "—"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => reorderSlides(idx, Math.max(0, idx - 1))} className={secondaryBtnClass()} aria-label="move up">↑</button>
                          <button onClick={() => reorderSlides(idx, Math.min(slides.length - 1, idx + 1))} className={secondaryBtnClass()} aria-label="move down">↓</button>
                          <button onClick={() => handleDeleteSlide(s?.id)} className={secondaryBtnClass()}>Delete</button>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-400 mt-2">Position {idx + 1}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Sales list — vertical product cards with image
  function SalesList() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Sales ({sales.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => loadSales().catch((e) => console.error("manual reload sales error:", e))} className={secondaryBtnClass()}>
              Reload
            </button>
          </div>
        </div>

        {loadingSales ? (
          <div className="p-4 rounded border">Loading sales...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sales.map((sale) => (
              <div key={sale?.id} className="p-4 rounded-2xl border bg-black/30 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{sale?.name || "Unnamed sale"}</div>
                    <div className="text-xs text-neutral-400">{(sale?.productIds || sale?.products || []).length} products</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" className="accent-white" checked={!!sale?.enabled} onChange={() => toggleSaleEnabled(sale?.id)} />
                      <span className="text-sm">Enabled</span>
                    </label>
                    <button className={secondaryBtnClass()}>Edit</button>
                    <button className={secondaryBtnClass()}>Delete</button>
                  </div>
                </div>
                <div className="text-xs text-neutral-400">ID: {sale?.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SaleCreator() {
    const [name, setName] = useState("");

    return (
      <div className="p-4 rounded-2xl border bg-gradient-to-b from-black/40 to-black/25 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-neutral-400">Sale name (displayed on home)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Summer Sale" className="px-3 py-2 rounded-md border border-white/8 bg-black/20 focus:outline-none" />
            <div className="text-xs text-neutral-400 mt-2">Selected products: {selectedProductIds.size}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleCreateSale({ name })} disabled={creatingSale} className={primaryBtnClass()}>
                {creatingSale ? "Creating..." : "Create Sale"}
              </button>
              <button onClick={() => { setName(""); setSelectedProductIds(new Set()); }} className={secondaryBtnClass()}>
                Reset
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex gap-2 items-center mb-3">
              {/* Make search input stable (not recreated) to avoid cursor jumps */}
              <input
                aria-label="Search products"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search products"
                className="flex-1 px-3 py-2 rounded-md border border-white/8 bg-black/10 focus:outline-none"
              />
              <select value={productSort} onChange={(e) => setProductSort(e.target.value)} className="px-3 py-2 rounded-md border border-white/8 bg-black/10">
                <option value="relevance">Relevance</option>
                <option value="priceAsc">Price — Low to High</option>
                <option value="priceDesc">Price — High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            <div className="space-y-3">
              {productsLoading ? (
                <div className="p-3 rounded border">Loading products...</div>
              ) : (
                products.map((p, i) => {
                  // stable key: prefer id, fallback to index (not Math.random)
                  const key = p?.id ?? `idx-${i}`;
                  const img = p?.image || p?.image_url || p?.thumbnail || "";
                  return (
                    <div key={key} className="p-3 rounded-2xl border bg-black/20 shadow-md flex gap-4 items-center">
                      <input type="checkbox" checked={selectedProductIds.has(p?.id)} onChange={() => toggleSelectProduct(p)} className="accent-white" />
                      <div className="w-28 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                        {img ? (
                          <img src={img} alt={p?.name || "product"} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">No image</div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="font-semibold text-sm">{p?.name}</div>
                        <div className="text-xs text-neutral-400">ID: {p?.id} • ₹{p?.price ?? "—"}</div>
                        <div className="text-xs text-neutral-500 mt-2 line-clamp-2">{p?.shortDescription || p?.description || ""}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-black text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Slides & Sales Management</h1>
        <p className="text-sm text-neutral-400 mb-6">Black & white admin — drag slides, create named sales, advanced UI with Tailwind animations.</p>

        <CenterToggle />
        <Note />

        {mode === "slides" ? (
          <div className="space-y-6">
            <SlideAddBox />
            <SlidesList />
          </div>
        ) : (
          <div className="space-y-6">
            <SaleCreator />
            <SalesList />
          </div>
        )}

        <div className="mt-8 text-xs text-neutral-500">Pro tip: Wire these endpoints to your Express routes: POST /api/upload, GET/POST/DELETE /api/admin/slides, /api/admin/slides/reorder, GET/POST /api/admin/sales, PATCH /api/admin/sales/:id/toggle, GET /api/admin/products</div>
      </div>
    </div>
  );
}
