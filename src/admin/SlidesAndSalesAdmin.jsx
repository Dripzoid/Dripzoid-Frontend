import React, { useEffect, useRef, useState } from "react";

/**
 * SlidesAndSalesAdmin.jsx (fixed)
 * Improved error handling for storage/backend errors (eg. Azure BlobNotFound / XML error responses)
 * - Parses XML error responses and surfaces clear messages in the UI instead of raw XML stack traces
 * - Provides retry / clear actions for uploads and loads
 * - Safer file input clearing (use value = "")
 * - Defensive rendering for possibly-missing images
 *
 * NOTE: This file still expects backend routes like:
 *  - GET /api/admin/slides
 *  - POST /api/admin/slides
 *  - DELETE /api/admin/slides/:id
 *  - POST /api/admin/slides/reorder
 *  - POST /api/uploads/cloudinary (form-data)
 *  - GET /api/admin/sales
 *  - POST /api/admin/sales
 *  - POST /api/admin/sales/:id/toggle
 *  - GET /api/admin/products
 *
 * The primary change here is robust error-parsing and user-friendly notifications when
 * the backend returns XML (Azure/other storage) errors like BlobNotFound.
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

  // --- Helpers ---
  function setNoteWithAutoClear(n, timeout = 6000) {
    setNote(n);
    if (timeout) {
      setTimeout(() => setNote((cur) => (cur === n ? null : cur)), timeout);
    }
  }

  // Parse error responses gracefully. If response body is XML (storage error), extract <Message>.
  async function parseErrorResponse(res) {
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    if (ct.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        // try common shapes
        return json.message || json.error || JSON.stringify(json);
      } catch (e) {
        return text;
      }
    }
    // xml-like detection -> extract <Message>...</Message> or <Code>...
    if (text && text.includes("<")) {
      const msgMatch = text.match(/<Message>([\s\S]*?)<\\/i) || text.match(/<Message>([\s\S]*?)<\/Message>/i);
      if (msgMatch && msgMatch[1]) return msgMatch[1].trim();
      const codeMatch = text.match(/<Code>([\s\S]*?)<\\/i) || text.match(/<Code>([\s\S]*?)<\/Code>/i);
      if (codeMatch && codeMatch[1]) return `Storage error: ${codeMatch[1].trim()}`;
      // fallback to short snippet of XML
      return `Server returned XML error: ${text.slice(0, 240)}...`;
    }
    return text || `${res.status} ${res.statusText}`;
  }

  async function safeFetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const parsed = await parseErrorResponse(res);
      throw new Error(parsed);
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    // unexpected content-type but ok status -> try parse JSON, else return text
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch (e) {
      return { data: txt };
    }
  }

  // --- API accessors ---
  async function apiGet(url) {
    return safeFetchJson(url, { credentials: "include" });
  }
  async function apiPost(url, body, isFormData = false) {
    const opts = { method: "POST", credentials: "include" };
    if (isFormData) {
      opts.body = body; // already a FormData
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    return safeFetchJson(url, opts);
  }
  async function apiDelete(url) {
    return safeFetchJson(url, { method: "DELETE", credentials: "include" });
  }

  // --- Loaders ---
  useEffect(() => {
    loadSlides();
    loadSales();
    // intentionally no deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlides() {
    setLoadingSlides(true);
    try {
      const data = await apiGet("/api/admin/slides");
      setSlides(data.slides || []);
    } catch (err) {
      console.error("loadSlides error:", err);
      // If the backend returned a storage error like BlobNotFound, provide a clear actionable message
      setNoteWithAutoClear({ type: "error", text: `Failed to load slides — ${err.message || err}` }, 10000);
    } finally {
      setLoadingSlides(false);
    }
  }

  async function loadSales() {
    setLoadingSales(true);
    try {
      const data = await apiGet("/api/admin/sales");
      setSales(data.sales || []);
    } catch (err) {
      console.error("loadSales error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load sales — ${err.message || err}` }, 8000);
    } finally {
      setLoadingSales(false);
    }
  }

  // --- Upload image (Cloudinary) with better error messages ---
  async function uploadImageToCloudinary(file) {
    if (!file) throw new Error("No file provided");
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch("/api/uploads/cloudinary", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) {
        const parsed = await parseErrorResponse(res);
        // Provide additional guidance if it's a storage blob error
        if (/(BlobNotFound|NoSuchKey|NotFound|404)/i.test(parsed)) {
          throw new Error(`${parsed} — check your storage/container or backend upload logic.`);
        }
        throw new Error(parsed);
      }
      const json = await res.json();
      if (!json || !json.url) throw new Error("Upload succeeded but server returned no 'url' field.");
      return json.url;
    } catch (err) {
      console.error("uploadImageToCloudinary error:", err);
      // rethrow for caller to handle UI
      throw err;
    }
  }

  // --- Slides actions ---
  async function handleAddSlide({ file, name, link }) {
    setAddingSlide(true);
    try {
      const url = await uploadImageToCloudinary(file);
      const saved = await apiPost("/api/admin/slides", { name, link, image: url });
      setSlides((s) => [...s, saved.slide || { id: Date.now(), name, link, image: url }]);
      setNoteWithAutoClear({ type: "success", text: "Slide added" }, 5000);
      // clear file input safely
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
      setSlides((s) => s.filter((x) => x.id !== id));
      setNoteWithAutoClear({ type: "success", text: "Slide removed" }, 4000);
    } catch (err) {
      console.error("handleDeleteSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to remove slide — ${err.message || err}` }, 8000);
    }
  }

  function moveSlide(id, dir) {
    setSlides((list) => {
      const i = list.findIndex((x) => x.id === id);
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
      await apiPost("/api/admin/slides/reorder", { order: newOrder.map((s) => s.id) });
      setNoteWithAutoClear({ type: "success", text: "Slides reordered" }, 4000);
    } catch (err) {
      console.error("updateSlidesOrder error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to save slide order — ${err.message || err}` }, 8000);
    }
  }

  // --- Products loading for sale creator ---
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
      setProducts(json.products || []);
    } catch (err) {
      console.error("loadProducts error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to load products — ${err.message || err}` }, 8000);
    } finally {
      setProductsLoading(false);
    }
  }

  // debounce-like trigger
  useEffect(() => {
    const t = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery, productSort]);

  function toggleSelectProduct(product) {
    setSelectedProductIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(product.id)) copy.delete(product.id);
      else copy.add(product.id);
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
      setSales((s) => [...s, saved.sale || { id: Date.now(), name, productIds: payload.productIds, enabled: true }]);
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
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return;
      const updated = await apiPost(`/api/admin/sales/${saleId}/toggle`, { enabled: !sale.enabled });
      setSales((list) => list.map((s) => (s.id === saleId ? { ...s, enabled: updated.enabled } : s)));
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
        <div className="inline-flex items-center rounded-full p-1 bg-neutral-100 dark:bg-neutral-900 shadow-inner">
          <button
            onClick={() => setMode("slides")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all ${mode === "slides" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent text-black/80 dark:text-white/80"}`}
          >
            Slides Management
          </button>
          <button
            onClick={() => setMode("sales")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all ${mode === "sales" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent text-black/80 dark:text-white/80"}`}
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
      const f = e.target.files?.[0];
      if (f) setFile(f);
    }

    function clearAll() {
      setFile(null);
      setPreview(null);
      setName("");
      setLink("");
      if (fileInputRef.current) fileInputRef.current.value = ""; // safe clear
    }

    return (
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-48 h-28 border border-dashed rounded overflow-hidden flex items-center justify-center">
              {preview ? <img src={preview} alt="preview" className="object-cover w-full h-full" /> : <div className="text-center text-sm text-neutral-500">Preview</div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 rounded shadow-sm border text-sm bg-neutral-50 dark:bg-neutral-900">Choose Image</button>
              <button onClick={clearAll} className="px-3 py-1 rounded shadow-sm border text-sm bg-transparent">Clear</button>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase text-neutral-500">Slide name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Winter Collection" className="px-3 py-2 rounded border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:outline-none" />
            <label className="text-xs font-semibold uppercase text-neutral-500">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/collection/winter" className="px-3 py-2 rounded border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:outline-none" />

            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAddSlide({ file, name, link })} disabled={!file || addingSlide} className="px-4 py-2 rounded-full font-semibold shadow-md border">
                {addingSlide ? "Adding..." : "Add Slide"}
              </button>
              <button onClick={clearAll} className="px-4 py-2 rounded-full border">Cancel</button>
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
            <button onClick={() => setSlides([])} title="Clear local view" className="text-sm px-3 py-1 rounded border">Clear View</button>
            <button onClick={loadSlides} className="text-sm px-3 py-1 rounded border">Reload</button>
          </div>
        </div>

        {loadingSlides ? (
          <div className="p-4 rounded border">Loading slides...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slides.map((s, idx) => (
              <div key={s.id} className="p-3 rounded border flex gap-3 items-center bg-neutral-50 dark:bg-neutral-900">
                <div className="w-28 h-20 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                  {/* Defensive image rendering: if image missing, show placeholder */}
                  {s.image ? (
                    // add onError to gracefully degrade if image 404s
                    // eslint-disable-next-line jsx-a11y/img-redundant-alt
                    <img src={s.image} alt={s.name || "slide"} className="object-cover w-full h-full" onError={(e) => { (e.target).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' font-size='18' fill='%23999' dominant-baseline='middle' text-anchor='middle'>Image not found</text></svg>"; }} />
                  ) : (
                    <div className="text-sm text-neutral-500">No image</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{s.name || "Untitled"}</div>
                      <div className="text-sm text-neutral-500">{s.link || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveSlide(s.id, "up")} className="px-2 py-1 rounded border" aria-label="move up">↑</button>
                      <button onClick={() => moveSlide(s.id, "down")} className="px-2 py-1 rounded border" aria-label="move down">↓</button>
                      <button onClick={() => handleDeleteSlide(s.id)} className="px-2 py-1 rounded border">Delete</button>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Position {idx + 1}</div>
                </div>
              </div>
            ))}
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
            <button onClick={loadSales} className="text-sm px-3 py-1 rounded border">Reload</button>
          </div>
        </div>

        {loadingSales ? (
          <div className="p-4 rounded border">Loading sales...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sales.map((sale) => (
              <div key={sale.id} className="p-3 rounded border flex flex-col gap-2 bg-neutral-50 dark:bg-neutral-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{sale.name || "Unnamed sale"}</div>
                    <div className="text-xs text-neutral-500">{(sale.productIds || sale.products || []).length} products</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" className="accent-black dark:accent-white" checked={!!sale.enabled} onChange={() => toggleSaleEnabled(sale.id)} />
                      <span className="text-sm">Enabled</span>
                    </label>
                    <button className="px-2 py-1 rounded border">Edit</button>
                    <button className="px-2 py-1 rounded border">Delete</button>
                  </div>
                </div>
                <div className="text-xs text-neutral-400">ID: {sale.id}</div>
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
      <div className="p-4 rounded-lg border bg-white dark:bg-black">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-neutral-500">Sale name (displayed on home)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Summer Sale" className="px-3 py-2 rounded border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900" />
            <div className="text-xs text-neutral-500 mt-2">Selected products: {selectedProductIds.size}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleCreateSale({ name })} disabled={creatingSale} className="px-4 py-2 rounded-full border">
                {creatingSale ? "Creating..." : "Create Sale"}
              </button>
              <button onClick={() => { setName(""); setSelectedProductIds(new Set()); }} className="px-4 py-2 rounded-full border">Reset</button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex gap-2 items-center mb-3">
              <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products" className="flex-1 px-3 py-2 rounded border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900" />
              <select value={productSort} onChange={(e) => setProductSort(e.target.value)} className="px-3 py-2 rounded border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
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
                  <label key={p.id} className="p-3 rounded border flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 cursor-pointer">
                    <input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => toggleSelectProduct(p)} className="accent-black dark:accent-white" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-neutral-500">ID: {p.id} • ₹{p.price}</div>
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold mb-2">Slides & Sales Management</h1>
        <p className="text-sm text-neutral-500 mb-4">Manage homepage carousel slides and named sales. Designed in a modern B/W aesthetic with full dark-mode support.</p>

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

        <div className="mt-8 text-xs text-neutral-400">Pro tip: You can wire the endpoints in this component to your Express routes: POST /api/uploads/cloudinary, GET/POST/DELETE /api/admin/slides, /api/admin/slides/reorder, GET/POST /api/admin/sales, POST /api/admin/sales/:id/toggle, GET /api/admin/products</div>
      </div>
    </div>
  );
}
