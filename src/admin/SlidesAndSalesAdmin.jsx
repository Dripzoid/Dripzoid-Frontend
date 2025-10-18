import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Plus,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Image as ImageIcon,
  Gift,
  Check,
  X,
  Edit2,
  GripVertical,
} from "lucide-react";
import ProductSearchBar from "../components/ProductSearchBar";

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                 */
/* -------------------------------------------------------------------------- */

const SalesList = ({ sales = [] }) => (
  <div>
    <h4>Sales</h4>
    {sales.length ? (
      <ul>
        {sales.map((s) => (
          <li key={s.id}>{s.title}</li>
        ))}
      </ul>
    ) : (
      <p>No sales yet.</p>
    )}
  </div>
);


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

  // UI states (kept same as before)
  const [mode, setMode] = useState("slides");
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);
  const fileInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null);

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [creatingSale, setCreatingSale] = useState(false);

  // Products (server-driven)
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [productSort, setProductSort] = useState("relevance");
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [totalProducts, setTotalProducts] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [note, setNote] = useState(null);

  // ref for input if parent wants to focus
  const searchInputRef = useRef(null);

  // helper functions (primaryBtnClass, secondaryBtnClass, setNoteWithAutoClear) ...
  function primaryBtnClass(extra = "") { return `inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow transition transform-gpu hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-black text-white dark:bg-white dark:text-black ${extra}`; }
  function secondaryBtnClass(extra = "") { return `inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition border border-neutral-200/30 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 bg-transparent ${extra}`; }
  function setNoteWithAutoClear(n, timeout = 6000) {
    setNote(n);
    if (timeout) {
      setTimeout(() => setNote((cur) => (cur === n ? null : cur)), timeout);
    }
  }

  // ... fetch helpers and API functions are same as your code (apiGet, apiPost, etc.)
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

  async function apiGet(path, signal) {
    const opts = { credentials: "include", headers: getAuthHeaders(false) };
    if (signal) opts.signal = signal;
    return safeFetchJson(buildUrl(path), opts);
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
        // initial fetch (no search)
        const cleanup = fetchProducts({ search: debouncedQuery, sort: mapSortToBackend(productSort), page: currentPage, limit: pageSize });
        return () => cleanup && cleanup();
      } catch (err) {
        console.error("initial load error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // slides / sales related functions (keep as in your code)...
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
  function onDragStartSlide(e, index) { dragIndexRef.current = index; try { e.dataTransfer.setData("text/plain", String(index)); e.dataTransfer.effectAllowed = "move"; } catch {} }
  function onDragEnterSlide(e, index) { e.preventDefault(); dragOverIndexRef.current = index; }
  function onDragOverSlide(e) { e.preventDefault(); }
  function onDropSlide(e) {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current != null ? dragOverIndexRef.current : Number(e.dataTransfer.getData("text/plain"));
    if (from == null || to == null || Number.isNaN(from) || Number.isNaN(to)) { dragIndexRef.current = null; dragOverIndexRef.current = null; return; }
    reorderSlides(from, to);
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
  }

  async function reorderSlides(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    setSlides((prev) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      if (fromIndex < 0 || fromIndex >= copy.length) return copy;
      const [item] = copy.splice(fromIndex, 1);
      const toClamped = Math.max(0, Math.min(toIndex, copy.length));
      copy.splice(toClamped, 0, item);
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
    if (!file) { setNoteWithAutoClear({ type: "error", text: "Please choose an image." }, 4000); return; }
    setAddingSlide(true);
    try {
      const url = await uploadImage(file);
      const saved = await apiPost("/api/admin/slides", { name, link, image_url: url });
      const newSlide = saved?.slide || (saved?.id ? { id: saved.id, name, link, image_url: url } : { id: Date.now(), name, link, image_url: url });
      setSlides((s) => [...(Array.isArray(s) ? s : []), newSlide]);
      setNoteWithAutoClear({ type: "success", text: "Slide added" }, 4000);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("handleAddSlide error:", err);
      setNoteWithAutoClear({ type: "error", text: `Failed to add slide — ${err.message || err}` }, 8000);
    } finally {
      setAddingSlide(false);
    }
  }

  // SALES load/create/toggle
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

  // PRODUCTS
  const mapSortToBackend = (sortKey) => {
    switch (sortKey) {
      case "priceAsc": return "price_asc";
      case "priceDesc": return "price_desc";
      case "newest": return "newest";
      case "nameAsc": return "name_asc";
      case "nameDesc": return "name_desc";
      default: return "";
    }
  };

  const fetchProducts = useCallback(({ search = "", sort = "", page = 1, limit = pageSize } = {}) => {
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      setProductsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", String(search));
        if (sort) params.append("sort", String(sort));
        if (page) params.append("page", String(page));
        if (limit) params.append("limit", String(limit));
        const path = `/api/products?${params.toString()}`;

        const json = await apiGet(path, signal);
        if (json && typeof json === "object") {
          const meta = json.meta || {};
          const data = json.data || (Array.isArray(json) ? json : []);
          setDisplayedProducts(Array.isArray(data) ? data : []);
          setTotalProducts(Number(meta.total ?? (Array.isArray(data) ? data.length : 0)));
        } else {
          setDisplayedProducts([]);
          setTotalProducts(0);
        }
      } catch (err) {
        if (err && (err.name === "AbortError" || (err.name === "DOMException" && err.code === 20))) {
          // aborted
        } else {
          console.error("fetchProducts error:", err);
          setNoteWithAutoClear({ type: "error", text: `Failed to load products — ${err.message || err}` }, 8000);
          setDisplayedProducts([]);
          setTotalProducts(0);
        }
      } finally {
        setProductsLoading(false);
      }
    })();

    return () => {
      try { controller.abort(); } catch {}
    };
  }, []);

  useEffect(() => {
    const backendSort = mapSortToBackend(productSort);
    const cleanup = fetchProducts({ search: debouncedQuery, sort: backendSort, page: currentPage, limit: pageSize });
    return () => cleanup && cleanup();
  }, [debouncedQuery, productSort, currentPage, fetchProducts]);

  function getPrimaryImage(item) {
    if (!item) return "";
    if (item.image) return item.image;
    if (item.image_url) return item.image_url;
    if (item.thumbnail) return item.thumbnail;
    const imagesField = item.images ?? item.images_url ?? item.imagesUrl ?? null;
    if (!imagesField) return "";
    if (Array.isArray(imagesField)) return imagesField[0] || "";
    if (typeof imagesField === "string") {
      const parts = imagesField.split(",").map((p) => p.trim()).filter(Boolean);
      return parts[0] || "";
    }
    return "";
  }

  function toggleSelectProduct(productOrId) {
    const id = productOrId?.id ?? productOrId;
    setSelectedProductIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  }

  // stable callback passed to ProductSearchBar
  const onSearchDebounced = useCallback((value) => {
    setDebouncedQuery(value || "");
    setCurrentPage(1);
  }, []);

  /* UI subcomponents (CenterToggle, Note, SlideAddBox, SlidesList, SalesList, SaleCreator)
     Keep same structure — the key part below is how ProductSearchBar is used */
  function CenterToggle() {
    return (
      <div className="w-full flex justify-center my-6">
        <div className="inline-flex items-center rounded-full p-1 bg-neutral-100/40 dark:bg-neutral-800/40 shadow-inner border border-neutral-200/20 dark:border-neutral-700/20">
          <button onClick={() => setMode("slides")} className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2 ${mode === "slides" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-neutral-800 dark:text-neutral-200"}`}>
            <ImageIcon className="w-4 h-4" /> Slides
          </button>
          <button onClick={() => setMode("sales")} className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2 ${mode === "sales" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-neutral-800 dark:text-neutral-200"}`}>
            <Gift className="w-4 h-4" /> Sales
          </button>
        </div>
      </div>
    );
  }

  function Note() {
    if (!note) return null;
    return (
      <div role="status" className={`mb-4 px-4 py-2 rounded-lg max-w-3xl mx-auto text-sm flex items-center gap-2 ${note.type === "success" ? "bg-white/6 text-white border border-white/10" : "bg-red-900/30 text-red-200 border border-red-800/30"}`}>
        {note.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        <div>{note.text}</div>
      </div>
    );
  }

  // SlideAddBox, SlidesList, SalesList are unchanged — omitted here for brevity in this snippet,
  // but in your file keep them exactly as you had previously.

  function SaleCreator() {
    const totalPages = Math.max(1, Math.ceil((totalProducts || 0) / pageSize));

    return (
      <div className="p-4 rounded-2xl border bg-gradient-to-b from-neutral-50/40 to-neutral-100/10 dark:from-neutral-900/40 dark:to-neutral-800/30 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-neutral-500">Sale name (displayed on home)</label>
            <input placeholder="Eg: Summer Sale" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />
            <div className="text-xs text-neutral-500 mt-2">Selected products: {selectedProductIds.size}</div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleCreateSale({ name: "New Sale" })} disabled={creatingSale} className={primaryBtnClass()}>
                <Plus className="w-4 h-4" />
                {creatingSale ? "Creating..." : "Create Sale"}
              </button>
              <button onClick={() => { setSelectedProductIds(new Set()); }} className={secondaryBtnClass()}>
                <X className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex gap-2 items-center mb-3">
              <div className="relative flex-1">
                {/* IMPORTANT: Do NOT pass `initial={debouncedQuery}` here.
                    Let ProductSearchBar manage live typing. We only pass the debounced callback. */}
                <ProductSearchBar
                  onDebounced={onSearchDebounced}
                  debounceMs={250}
                  ref={searchInputRef}
                />
              </div>

              <select value={productSort} onChange={(e) => setProductSort(e.target.value)} className="px-3 py-3 rounded-full border border-neutral-200 bg-white/5">
                <option value="relevance">Relevance</option>
                <option value="priceAsc">Price — Low to High</option>
                <option value="priceDesc">Price — High to Low</option>
                <option value="newest">Newest</option>
                <option value="nameAsc">Name A→Z</option>
                <option value="nameDesc">Name Z→A</option>
              </select>
            </div>

            {/* the product list, pagination etc. remain exactly as you had them */}
            {/* ... (rest of sale creator product UI) ... */}
          </div>
        </div>
      </div>
    );
  }

  // MAIN render (keep the rest of your layout the same)
  return (
    <div className="min-h-screen p-6 bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Slides & Sales Management</h1>
        <p className="text-sm text-neutral-500 mb-6">Black & white admin — drag slides, create named sales, advanced UI with icons & Tailwind animations.</p>

        <CenterToggle />
        <Note />

        {mode === "slides" ? (
          <div className="space-y-6">
            {/* keep your SlideAddBox and SlidesList components here */}
            {/* ... */}
          </div>
        ) : (
          <div className="space-y-6">
            <SaleCreator />
            <SalesList />
          </div>
        )}

      </div>
    </div>
  );
}
