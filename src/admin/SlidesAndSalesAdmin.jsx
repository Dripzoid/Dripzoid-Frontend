import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Plus,
  UploadCloud,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Search,
  Image as ImageIcon,
  Gift,
  Check,
  X,
  Edit2,
  GripVertical,
} from "lucide-react";

/**
 * ProductSearchBar
 * - Keeps its own visible state to avoid parent re-renders stomping keystrokes
 * - Preserves caret/selection using useLayoutEffect
 * - Handles IME composition (compositionstart/compositionend)
 * - Debounces to parent; flushes on compositionend
 */
const ProductSearchBar = React.memo(function ProductSearchBar({
  initial = "",
  onDebounced,
  inputRef,
  debounceMs = 250,
}) {
  const [localValue, setLocalValue] = useState(initial);
  const selectionRef = useRef({ start: null, end: null, direction: null });
  const debounceRef = useRef(null);
  const isComposingRef = useRef(false);

  // internal ref fallback
  const internalRef = useRef(null);
  const elRef = inputRef || internalRef;

  // Sync initial -> localValue only when input NOT focused and not composing
  useEffect(() => {
    const el = elRef.current;
    const isFocused = typeof document !== "undefined" && el === document.activeElement;
    if (!isFocused && !isComposingRef.current && initial !== localValue) {
      setLocalValue(initial);
    }
    // intentionally don't include localValue as dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, elRef]);

  function handleChange(e) {
    const el = e.target;
    try {
      if (el && typeof el.selectionStart === "number") {
        selectionRef.current = {
          start: el.selectionStart,
          end: el.selectionEnd,
          direction: el.selectionDirection || "none",
        };
      }
    } catch {
      selectionRef.current = { start: null, end: null, direction: null };
    }
    setLocalValue(el.value);
  }

  function handleCompositionStart() {
    isComposingRef.current = true;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }

  function handleCompositionEnd(e) {
    isComposingRef.current = false;
    // capture selection & flush immediately
    try {
      const el = elRef.current;
      if (el && typeof el.selectionStart === "number") {
        selectionRef.current = {
          start: el.selectionStart,
          end: el.selectionEnd,
          direction: el.selectionDirection || "none",
        };
      }
    } catch {}
    // flush to parent
    onDebounced(e.target.value);
  }

  // restore caret/selection synchronously after render, but skip while composing
  useLayoutEffect(() => {
    if (isComposingRef.current) return;
    const sel = selectionRef.current;
    const el = elRef.current;
    if (el && sel && sel.start != null && typeof el.setSelectionRange === "function") {
      try {
        const max = el.value.length;
        const start = Math.max(0, Math.min(sel.start, max));
        const end = Math.max(0, Math.min(sel.end ?? start, max));
        el.setSelectionRange(start, end, sel.direction === "forward" ? "forward" : "none");
      } catch {
        // ignore
      }
    }
  }, [localValue, elRef]);

  // debounce sending value to parent (skip when composing)
  useEffect(() => {
    if (isComposingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onDebounced(localValue);
    }, debounceMs);
    return () => clearTimeout(debounceRef.current);
  }, [localValue, debounceMs, onDebounced]);

  return (
    <div className="relative w-full">
      <input
        ref={elRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="Search products (name, id, sku, description, tags)"
        autoComplete="off"
        className="w-full pl-12 pr-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none"
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60 w-4 h-4" />
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                 */
/* -------------------------------------------------------------------------- */

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

  // -- UI modes
  const [mode, setMode] = useState("slides");

  // Slides
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);
  const fileInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const dragOverIndexRef = useRef(null);

  // Sales
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [creatingSale, setCreatingSale] = useState(false);

  // Products (server-driven)
  const [displayedProducts, setDisplayedProducts] = useState([]); // page data
  const [productsLoading, setProductsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(""); // the debounced search value from ProductSearchBar
  const [productSort, setProductSort] = useState("relevance");
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [totalProducts, setTotalProducts] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // UI note
  const [note, setNote] = useState(null);

  // ref for search input (passed to ProductSearchBar)
  const searchInputRef = useRef(null);

  // Styles helper funcs
  function primaryBtnClass(extra = "") {
    return `inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow transition transform-gpu hover:-translate-y-0.5 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-black text-white dark:bg-white dark:text-black ${extra}`;
  }
  function secondaryBtnClass(extra = "") {
    return `inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition border border-neutral-200/30 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 bg-transparent ${extra}`;
  }

  function setNoteWithAutoClear(n, timeout = 6000) {
    setNote(n);
    if (timeout) {
      setTimeout(() => setNote((cur) => (cur === n ? null : cur)), timeout);
    }
  }

  // fetch helpers (reuse pattern from your code)
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
        // initially fetch the first page of products (empty search)
        fetchProducts({ search: debouncedQuery, sort: productSort, page: currentPage, limit: pageSize });
      } catch (err) {
        console.error("initial load error:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, productSort]);

  // -- SLIDES (same as your working implementation)
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

  function onDragStartSlide(e, index) {
    dragIndexRef.current = index;
    try {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  }
  function onDragEnterSlide(e, index) {
    e.preventDefault();
    dragOverIndexRef.current = index;
  }
  function onDragOverSlide(e) {
    e.preventDefault();
  }
  function onDropSlide(e) {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current != null ? dragOverIndexRef.current : Number(e.dataTransfer.getData("text/plain"));
    if (from == null || to == null || Number.isNaN(from) || Number.isNaN(to)) {
      dragIndexRef.current = null;
      dragOverIndexRef.current = null;
      return;
    }
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
    if (!file) {
      setNoteWithAutoClear({ type: "error", text: "Please choose an image." }, 4000);
      return;
    }
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

  // -- SALES
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

  // PRODUCTS - server-driven fetch
  // map front-end sort keys to backend sort param names
  const mapSortToBackend = (sortKey) => {
    switch (sortKey) {
      case "priceAsc":
        return "price_asc";
      case "priceDesc":
        return "price_desc";
      case "newest":
        return "newest";
      case "nameAsc":
        return "name_asc";
      case "nameDesc":
        return "name_desc";
      default:
        return ""; // backend default
    }
  };

  // fetchProducts with abort support and server pagination
  const fetchProducts = useCallback(
    async ({ search = "", sort = "", page = 1, limit = pageSize } = {}) => {
      setProductsLoading(true);
      const controller = new AbortController();
      const signal = controller.signal;

      // build query string (encode)
      const params = new URLSearchParams();
      if (search) params.append("search", String(search));
      if (sort) params.append("sort", String(sort));
      if (page) params.append("page", String(page));
      if (limit) params.append("limit", String(limit));

      // Choose the correct path - your products router looked like it expects /api/products
      const path = `/api/products?${params.toString()}`;

      try {
        const json = await apiGet(path, signal);
        // backend returns { meta: {...}, data: [...] } according to products.js
        if (json && typeof json === "object") {
          const meta = json.meta || {};
          const data = json.data || (Array.isArray(json) ? json : []);
          setDisplayedProducts(Array.isArray(data) ? data : []);
          setTotalProducts(Number(meta.total || (Array.isArray(data) ? data.length : 0)));
        } else {
          setDisplayedProducts([]);
          setTotalProducts(0);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          // ignore aborts
        } else {
          console.error("fetchProducts error:", err);
          setNoteWithAutoClear({ type: "error", text: `Failed to load products — ${err.message || err}` }, 8000);
          setDisplayedProducts([]);
          setTotalProducts(0);
        }
      } finally {
        setProductsLoading(false);
      }

      return () => controller.abort();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // trigger fetch when debouncedQuery, productSort, or currentPage changes
  useEffect(() => {
    const backendSort = mapSortToBackend(productSort);
    const abortFn = fetchProducts({ search: debouncedQuery, sort: backendSort, page: currentPage, limit: pageSize });
    // fetchProducts returns a function that aborts? (we return cleanup above)
    // But to ensure abort, we also set up cleanup:
    return () => {
      if (typeof abortFn === "function") abortFn();
    };
  }, [debouncedQuery, productSort, currentPage, fetchProducts]);

  // convert product object -> primary image
  function getPrimaryImage(item) {
    if (!item) return "";
    if (item.image) return item.image;
    if (item.image_url) return item.image_url;
    if (item.thumbnail) return item.thumbnail;
    const imagesField = item.images ?? item.images_url ?? item.imagesUrl ?? null;
    if (!imagesField) return "";
    if (Array.isArray(imagesField)) {
      return imagesField[0] || "";
    }
    if (typeof imagesField === "string") {
      const parts = imagesField.split(",").map((p) => p.trim()).filter(Boolean);
      return parts[0] || "";
    }
    return "";
  }

  // toggle selection
  function toggleSelectProduct(productOrId) {
    const id = productOrId?.id ?? productOrId;
    setSelectedProductIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  // stable callback passed to ProductSearchBar
  const onSearchDebounced = useCallback((value) => {
    // parent receives debounced string
    setDebouncedQuery(value || "");
  }, []);

  /* ----------------- UI components (kept similar) ----------------- */
  function CenterToggle() {
    return (
      <div className="w-full flex justify-center my-6">
        <div className="inline-flex items-center rounded-full p-1 bg-neutral-100/40 dark:bg-neutral-800/40 shadow-inner border border-neutral-200/20 dark:border-neutral-700/20">
          <button
            onClick={() => setMode("slides")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2 ${mode === "slides" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-neutral-800 dark:text-neutral-200"}`}
          >
            <ImageIcon className="w-4 h-4" />
            Slides
          </button>
          <button
            onClick={() => setMode("sales")}
            className={`px-6 py-2 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2 ${mode === "sales" ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "bg-transparent text-neutral-800 dark:text-neutral-200"}`}
          >
            <Gift className="w-4 h-4" />
            Sales
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
      <div className="p-4 rounded-2xl border bg-gradient-to-b from-neutral-50/40 to-neutral-100/10 dark:from-neutral-900/40 dark:to-neutral-800/30 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-64 h-36 border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center bg-white/5">
              {preview ? <img src={preview} alt="preview" className="object-cover w-full h-full" /> : <div className="text-center text-sm text-neutral-400">Preview</div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className={primaryBtnClass()}>
                <UploadCloud className="w-4 h-4" />
                Choose Image
              </button>
              <button onClick={clearAll} className={secondaryBtnClass()}>
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-3">
            <label className="text-xs font-semibold uppercase text-neutral-500">Slide name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eg: Winter Collection" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />
            <label className="text-xs font-semibold uppercase text-neutral-500">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/collection/winter" className="px-4 py-3 rounded-full border border-neutral-200 bg-white/5 focus:outline-none" />

            <div className="flex gap-2 mt-2">
              <button onClick={() => handleAddSlide({ file, name, link })} disabled={!file || addingSlide} className={primaryBtnClass(addingSlide ? "opacity-70 pointer-events-none" : "")}>
                <Plus className="w-4 h-4" />
                {addingSlide ? "Adding..." : "Add Slide"}
              </button>
              <button onClick={clearAll} className={secondaryBtnClass()}>
                <X className="w-4 h-4" />
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Slides ({slides.length})</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setSlides([])} title="Clear local view" className={secondaryBtnClass()}>
              <X className="w-4 h-4" />
              Clear View
            </button>
            <button onClick={() => loadSlides().catch((e) => console.error("manual reload slides error:", e))} className={secondaryBtnClass()}>
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
        </div>

        {loadingSlides ? (
          <div className="p-4 rounded-md border">Loading slides...</div>
        ) : (
          <div className="w-full max-w-3xl mx-auto space-y-3">
            {slides.map((s, idx) => {
              const image = s?.image_url || s?.image || s?.imageUrl || s?.imageurl || "";
              const isDragOver = dragOverIndexRef.current === idx;
              return (
                <div
                  key={s?.id ?? idx}
                  draggable
                  onDragStart={(e) => onDragStartSlide(e, idx)}
                  onDragEnter={(e) => onDragEnterSlide(e, idx)}
                  onDragOver={(e) => onDragOverSlide(e)}
                  onDrop={onDropSlide}
                  className={`flex gap-4 items-center p-4 rounded-2xl border bg-white/5 shadow-md transition-all ${isDragOver ? "ring-2 ring-offset-2 ring-black/30 dark:ring-white/30" : ""}`}
                >
                  <div className="w-44 h-28 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center relative flex-shrink-0">
                    {image ? <img src={image} alt={s?.name || "slide"} className="object-cover w-full h-full" /> : <div className="text-sm text-neutral-400">No image</div>}
                    <div className="absolute top-2 left-2 p-1 rounded-md bg-black/40">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">{s?.name || "Untitled"}</div>
                        <div className="text-sm text-neutral-500 mt-1">{s?.link || "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); reorderSlides(idx, Math.max(0, idx - 1)); }} className={secondaryBtnClass()} aria-label="move up">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); reorderSlides(idx, Math.min(slides.length - 1, idx + 1)); }} className={secondaryBtnClass()} aria-label="move down">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(s?.id); }} className={secondaryBtnClass()}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-2">Position {idx + 1}</div>
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
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
          </div>
        </div>

        {loadingSales ? (
          <div className="p-4 rounded border">Loading sales...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sales.map((sale) => (
              <div key={sale?.id} className="p-4 rounded-2xl border bg-white/3 shadow-md flex flex-col gap-3">
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
                    <button className={secondaryBtnClass()}>
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button className={secondaryBtnClass()}>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-xs text-neutral-500">ID: {sale?.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function SaleCreator() {
    const totalPages = Math.max(1, Math.ceil((totalProducts || 0) / pageSize));
    const start = (currentPage - 1) * pageSize;

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
                <X className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex gap-2 items-center mb-3">
              <div className="relative flex-1">
                <ProductSearchBar
                  initial={debouncedQuery}
                  onDebounced={onSearchDebounced}
                  inputRef={searchInputRef}
                  debounceMs={250}
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

            <div className="space-y-3">
              {productsLoading ? (
                <div className="p-3 rounded border">Loading products...</div>
              ) : displayedProducts.length === 0 ? (
                <div className="p-3 rounded border">No products found.</div>
              ) : (
                displayedProducts.map((p, i) => {
                  const key = p?.id ?? `idx-${i}`;
                  const img = getPrimaryImage(p);
                  const selected = selectedProductIds.has(p?.id);
                  return (
                    <div
                      key={key}
                      onClick={() => toggleSelectProduct(p?.id)}
                      className={`p-3 rounded-2xl border bg-white/4 shadow-md flex gap-4 items-center cursor-pointer ${selected ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""}`}
                    >
                      <input onClick={(e) => { e.stopPropagation(); toggleSelectProduct(p?.id); }} type="checkbox" checked={selected} className="accent-black dark:accent-white" readOnly />
                      <div className="w-28 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 relative">
                        {img ? (
                          <img src={img} alt={p?.name || "product"} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">No image</div>
                        )}
                        <div className="absolute top-1 right-1 bg-black/60 rounded px-2 py-0.5 text-xs text-white">
                          ₹{p?.price ?? "—"}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-sm">{p?.name}</div>
                          <button onClick={(e) => { e.stopPropagation(); toggleSelectProduct(p?.id); }} className={secondaryBtnClass()} title="Toggle select">
                            {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="text-xs text-neutral-500">ID: {p?.id}</div>
                        <div className="text-xs text-neutral-500 mt-2 line-clamp-2">{p?.shortDescription || p?.description || ""}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-neutral-500">Page {currentPage} of {Math.max(1, Math.ceil((totalProducts || 0) / pageSize))}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className={secondaryBtnClass(currentPage === 1 ? "opacity-50 pointer-events-none" : "")}>Prev</button>
                {Array.from({ length: Math.max(1, Math.ceil((totalProducts || 0) / pageSize)) }).map((_, idx) => {
                  const page = idx + 1;
                  if (page > 7) return null;
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded-full ${page === currentPage ? "bg-black text-white" : "bg-transparent text-neutral-600 border border-neutral-200/10"}`}>
                      {page}
                    </button>
                  );
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(Math.max(1, Math.ceil((totalProducts || 0) / pageSize)), p + 1))} disabled={currentPage === Math.ceil((totalProducts || 0) / pageSize)} className={secondaryBtnClass(currentPage === Math.ceil((totalProducts || 0) / pageSize) ? "opacity-50 pointer-events-none" : "")}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // main render
  return (
    <div className="min-h-screen p-6 bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-white transition-colors">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2">Slides & Sales Management</h1>
        <p className="text-sm text-neutral-500 mb-6">Black & white admin — drag slides, create named sales, advanced UI with icons & Tailwind animations.</p>

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

        <div className="mt-8 text-xs text-neutral-500">Pro tip: Wire these endpoints to your Express routes: POST /api/upload, GET/POST/DELETE /api/admin/slides, /api/admin/slides/reorder, GET/POST /api/admin/sales, PATCH /api/admin/sales/:id/toggle, GET /api/products</div>
      </div>
    </div>
  );
}
