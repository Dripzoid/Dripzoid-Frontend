import React, { useEffect, useRef, useState } from "react";

/**
 * SlidesAndSalesAdmin.jsx — Fixed + defensive
 * - Uses localStorage key "token" for Authorization
 * - Defensive error parsing and fetch handling to avoid blank page
 * - Preserves modern Tailwind styles and B/W dark-mode buttons
 */

export default function SlidesAndSalesAdmin() {
  const [mode, setMode] = useState("slides");

  // Slides
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);
  const fileInputRef = useRef(null);

  // Sales
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [creatingSale, setCreatingSale] = useState(false);

  // Products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productFilters] = useState({ category: "", priceMin: "", priceMax: "" });
  const [productSort, setProductSort] = useState("relevance");
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // UI note
  const [note, setNote] = useState(null);

  // Styling helpers
  function primaryBtnClass(extra = "") {
    // Black in light mode, white in dark mode
    return `inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-black text-white dark:bg-white dark:text-black ${extra}`;
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

  // Always read token from "token"
  function getAuthHeaders(addJson = true) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (addJson) headers["Content-Type"] = "application/json";
    return headers;
  }

  // Parse error responses gracefully (JSON or XML). Defensive to avoid runtime crashes.
  async function parseErrorResponse(res) {
    // Defensive: if res is not a Response-like object, return safe message
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
        // look for <Message> or <Code>
        const msgMatch = text.match(/<Message>([\s\S]*?)<\/Message>/i) || text.match(/<Message>([\s\S]*?)<\//i);
        if (msgMatch && msgMatch[1]) return msgMatch[1].trim();
        const codeMatch = text.match(/<Code>([\s\S]*?)<\/Code>/i) || text.match(/<Code>([\s\S]*?)<\//i);
        if (codeMatch && codeMatch[1]) return `Storage error: ${codeMatch[1].trim()}`;
        return `Server returned XML error: ${text.slice(0, 240)}...`;
      }
      return text || `${res.status || "error"} ${res.statusText || ""}`;
    } catch (err) {
      return `Network error or malformed error response`;
    }
  }

  // safe fetch -> parse, throw friendly message
  async function safeFetchJson(url, opts = {}) {
    let res;
    try {
      res = await fetch(url, opts);
    } catch (fetchErr) {
      // network-level error
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
      } catch (e) {
        // malformed JSON, return text
        const txt = await res.text().catch(() => "");
        return { data: txt };
      }
    }
    // fallback: try parse text to JSON else return text
    const txt = await res.text().catch(() => "");
    try {
      return JSON.parse(txt);
    } catch {
      return { data: txt };
    }
  }

  // API helpers (include Authorization header if present)
  async function apiGet(url) {
    return safeFetchJson(url, { credentials: "include", headers: getAuthHeaders(false) });
  }
  async function apiPost(url, body, isFormData = false) {
    const opts = { method: "POST", credentials: "include" };
    if (isFormData) {
      opts.body = body;
      // add auth header if token exists
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) opts.headers = { Authorization: `Bearer ${token}` };
    } else {
      opts.headers = getAuthHeaders(true);
      opts.body = JSON.stringify(body);
    }
    return safeFetchJson(url, opts);
  }
  async function apiPatch(url, body) {
    return safeFetchJson(url, { method: "PATCH", credentials: "include", headers: getAuthHeaders(true), body: JSON.stringify(body) });
  }
  async function apiDelete(url) {
    return safeFetchJson(url, { method: "DELETE", credentials: "include", headers: getAuthHeaders(false) });
  }

  // Load on mount — use IIFE to safely await and catch errors
  useEffect(() => {
    (async () => {
      try {
        await loadSlides();
        await loadSales();
      } catch (err) {
        // already handled in the individual loaders, but guard here too
        console.error("initial load error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load slides
  async function loadSlides() {
    setLoadingSlides(true);
    try {
      const data = await apiGet("/api/admin/slides");
      const arr = Array.isArray(data) ? data : data.slides || data.data || [];
      // ensure arr is array
      setSlides(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("loadSlides error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load slides — ${err.message || err}` }, 10000);
      setSlides([]); // be explicit
    } finally {
      setLoadingSlides(false);
    }
  }

  // Load sales
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

  // Upload image (Cloudinary)
  async function uploadImageToCloudinary(file) {
    if (!file) throw new Error("No file provided");
    const fd = new FormData();
    fd.append("image", file);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await fetch("/api/uploads/cloudinary", { method: "POST", body: fd, credentials: "include", headers });
      if (!res.ok) {
        const parsed = await parseErrorResponse(res);
        if (/(BlobNotFound|NoSuchKey|NotFound|404)/i.test(parsed)) {
          throw new Error(`${parsed} — check your storage/container or backend upload logic.`);
        }
        throw new Error(parsed);
      }
      const json = await res.json().catch(() => null);
      if (!json || !(json.url || json.secure_url)) throw new Error("Upload succeeded but server returned no 'url' field.");
      return json.url || json.secure_url;
    } catch (err) {
      console.error("uploadImageToCloudinary error:", err);
      throw err;
    }
  }

  // Slides actions
  async function handleAddSlide({ file, name, link }) {
    setAddingSlide(true);
    try {
      const url = await uploadImageToCloudinary(file);
      const saved = await apiPost("/api/admin/slides", { name, link, image_url: url });
      const newSlide = saved?.slide || (saved?.id ? { id: saved.id, name, link, image_url: url } : { id: Date.now(), name, link, image_url: url });
      setSlides((s) => [...s, newSlide]);
      setNoteWithAutoClear({ type: "success", text: "Slide added" }, 5000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("handleAddSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to add slide — ${err.message || err}` }, 10000);
    } finally {
      setAddingSlide(false);
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

  function moveSlide(id, dir) {
    setSlides((list) => {
      if (!Array.isArray(list)) return list;
      const i = list.findIndex((x) => x?.id === id);
      if (i < 0) return list;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      updateSlidesOrder(copy);
      return copy;
    });
  }

  async function updateSlidesOrder(newOrder) {
    try {
      await apiPost("/api/admin/slides/reorder", { order: newOrder.map((s) => s?.id) });
      setNoteWithAutoClear({ type: "success", text: "Slides reordered" }, 4000);
    } catch (err) {
      console.error("updateSlidesOrder error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to save slide order — ${err.message || err}` }, 8000);
    }
  }

  // Products loading for sale creator
  async function loadProducts({ page = 1 } = {}) {
    setProductsLoading(true);
    try {
      const q = new URLSearchParams();
      if (productQuery) q.set("q", productQuery);
      if (productFilters.category) q.set("category", productFilters.category);
      if (productFilters.priceMin) q.set("priceMin", productFilters.priceMin);
      if (productFilters.priceMax) q.set("priceMax", productFilters.priceMax);
      if (productSort) q.set("sort", productSort);
      q.set("page", String(page));
      const json = await apiGet(`/api/admin/products?${q.toString()}`);
      const arr = Array.isArray(json) ? json : json.products || json.data || [];
      setProducts(Array.isArray(arr) ? arr : []);
    } catch (err) {
      console.error("loadProducts error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load products — ${err.message || err}` }, 8000);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }

  // debounce-like trigger
  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts().catch((e) => console.error("debounced loadProducts error:", e));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery, productSort]);

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

  // --- Small UI components ---
  function CenterToggle() {
    return (
      <div className="w-full flex justify-center my-6">
        <div className="inline-flex items-center rounded-full p-1 bg-neutral-100 dark:bg-neutral-900 shadow-inner border border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setMode("slides")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all ${mode === "slides" ? "bg-black text-white dark:bg-white dark:text-black shadow" : "bg-transparent text-black/80 dark:text-white/80"}`}
          >
            Slides Management
          </button>
          <button
            onClick={() => setMode("sales")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all ${mode === "sales" ? "bg-black text-white dark:bg-white dark:text-black shadow" : "bg-transparent text-black/80 dark:text-white/80"}`}
          >
            Sale Management
          </button>
        </div>
      </div>
    );
  }

  function Note() {
    if (!note) return null;
    return (
      <div
        role="status"
        className={`mb-4 px-4 py-2 rounded shadow-sm max-w-3xl mx-auto text-sm ${note.type === "success" ? "bg-green-50 text-green-800 dark:bg-green-900/30" : "bg-red-50 text-red-800 dark:bg-red-900/30"}`}
      >
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
      <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-56 h-32 border-2 border-dashed rounded-lg overflow-hidden flex items-center justify-center bg-white/5">
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
            <label className="text-xs font-semibold uppercase text-neutral-500">Slide name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Winter Collection" className="px-3 py-2 rounded-md border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus:outline-none" />
            <label className="text-xs font-semibold uppercase text-neutral-500">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/collection/winter" className="px-3 py-2 rounded-md border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 focus:outline-none" />

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

  function SlidesList() {
    return (
      <div className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slides.map((s, idx) => {
              // defensive image field fallbacks
              const image = s?.image_url || s?.image || s?.imageUrl || s?.imageurl || "";
              return (
                <div key={s?.id ?? idx} className="p-3 rounded-2xl border flex gap-3 items-center bg-neutral-50 dark:bg-neutral-800 shadow-sm">
                  <div className="w-28 h-20 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                    {image ? (
                      <img
                        src={image}
                        alt={s?.name || "slide"}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          try {
                            e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' font-size='18' fill='%23999' dominant-baseline='middle' text-anchor='middle'>Image not found</text></svg>";
                          } catch {
                            /* ignore */
                          }
                        }}
                      />
                    ) : (
                      <div className="text-sm text-neutral-500">No image</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{s?.name || "Untitled"}</div>
                        <div className="text-sm text-neutral-500">{s?.link || "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => moveSlide(s?.id, "up")} className={secondaryBtnClass()} aria-label="move up">↑</button>
                        <button onClick={() => moveSlide(s?.id, "down")} className={secondaryBtnClass()} aria-label="move down">↓</button>
                        <button onClick={() => handleDeleteSlide(s?.id)} className={secondaryBtnClass()}>Delete</button>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">Position {idx + 1}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sales.map((sale) => (
              <div key={sale?.id ?? Math.random()} className="p-3 rounded-2xl border flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{sale?.name || "Unnamed sale"}</div>
                    <div className="text-xs text-neutral-500">{(sale?.productIds || sale?.products || []).length} products</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" className="accent-black dark:accent-white" checked={!!sale?.enabled} onChange={() => toggleSaleEnabled(sale?.id)} />
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
      <div className="p-4 rounded-2xl border bg-white dark:bg-neutral-900 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-neutral-500">Sale name (displayed on home)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Summer Sale" className="px-3 py-2 rounded-md border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800" />
            <div className="text-xs text-neutral-500 mt-2">Selected products: {selectedProductIds.size}</div>
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
              <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products" className="flex-1 px-3 py-2 rounded-md border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800" />
              <select value={productSort} onChange={(e) => setProductSort(e.target.value)} className="px-3 py-2 rounded-md border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800">
                <option value="relevance">Relevance</option>
                <option value="priceAsc">Price — Low to High</option>
                <option value="priceDesc">Price — High to Low</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {productsLoading ? (
                <div className="p-3 rounded border">Loading products...</div>
              ) : (
                products.map((p) => (
                  <label key={p?.id ?? Math.random()} className="p-3 rounded border flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800 cursor-pointer">
                    <input type="checkbox" checked={selectedProductIds.has(p?.id)} onChange={() => toggleSelectProduct(p)} className="accent-black dark:accent-white" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{p?.name}</div>
                      <div className="text-xs text-neutral-500">ID: {p?.id} • ₹{p?.price}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white text-black dark:bg-black dark:text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Slides & Sales Management</h1>
        <p className="text-sm text-neutral-500 mb-6">Manage homepage carousel slides and named sales. Modern B/W aesthetic with dark-mode-first polish.</p>

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

        <div className="mt-8 text-xs text-neutral-400">Pro tip: Wire these endpoints to your Express routes: POST /api/uploads/cloudinary, GET/POST/DELETE /api/admin/slides, /api/admin/slides/reorder, GET/POST /api/admin/sales, PATCH /api/admin/sales/:id/toggle, GET /api/admin/products</div>
      </div>
    </div>
  );
}
