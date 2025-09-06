// src/admin/OrderManagement.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  BarChart3, PackageSearch, ClipboardList, Upload,
  Eye, Edit, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Truck, User2, Trash2, Copy,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../utils/api";

// -----------------------------
// CONFIG / HELPERS
// -----------------------------
const DEBUG = false; // set true while debugging network/params
const STATUS_OPTIONS = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

// normalize axios-like response or raw data
const normalize = (res) => {
  if (!res) return {};
  if (res.data && typeof res.data === "object") return res.data;
  return res;
};

const serializeParamsForLog = (p = {}) => {
  try {
    return Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  } catch {
    return JSON.stringify(p);
  }
};

const buildUrlWithParams = (baseUrl, params = {}) => {
  try {
    const entries = [];
    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        v.forEach(val => entries.push([k, String(val)]));
      } else if (typeof v === "object") {
        entries.push([k, JSON.stringify(v)]);
      } else {
        entries.push([k, String(v)]);
      }
    }
    if (!entries.length) return baseUrl;
    const usp = new URLSearchParams(entries);
    return `${baseUrl}?${usp.toString()}`;
  } catch {
    const qs = Object.entries(params || {}).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }
};

const formatCurrency = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    : "₹0.00";

const safeItemsCount = (order) => {
  if (!order) return 0;
  if (Array.isArray(order.items) && order.items.length) return order.items.length;
  if (Array.isArray(order.line_items) && order.line_items.length) return order.line_items.length;
  const numeric = Number(order?.items_count ?? order?.item_count ?? order?.products_count ?? 0);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (order?.items && !Array.isArray(order.items)) {
    const n = Number(order.items);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const userNameFrom = (o) =>
  (o?.user_name ||
    o?.username ||
    o?.name ||
    o?.full_name ||
    o?.customer ||
    o?.customer_name ||
    (o.user && (o.user.name || o.user.full_name)) ||
    "").trim();

const userIdFrom = (o) => (o?.user_id ?? (o.user && o.user.id) ?? "-");

const deliveryDateFrom = (o) =>
  o?.delivery_date ?? o?.expected_delivery ?? o?.delivers_on ?? o?.created_at ?? "";

// attempt multiple GET endpoints (returns first successful response)
// IMPORTANT: builds full URL with query params to ensure api.get receives them
async function tryGetMany(urls = [], params = {}) {
  for (const u of urls) {
    try {
      const urlWithParams = buildUrlWithParams(u, params);
      if (DEBUG) console.debug(`[tryGetMany] GET ${urlWithParams}`);
      // Many api wrappers accept full URL as first arg. Provide empty params object as second to be safe.
      const res = await api.get(urlWithParams, {}, true);
      if (res) {
        if (DEBUG) console.debug(`[tryGetMany] success ${urlWithParams}`);
        return res;
      }
    } catch (err) {
      if (DEBUG) console.debug(`[tryGetMany] failed ${u} with params ${serializeParamsForLog(params)}`, err);
      // try next
    }
  }
  return null;
}

// client-side sorting fallback
const sortOrdersClient = (list = [], sort = "newest") => {
  if (!Array.isArray(list)) return list;
  const copy = [...list];
  const getAmount = (o) => Number(o.total_amount ?? o.amount ?? 0);
  const getDate = (o) => (deliveryDateFrom(o) || o.created_at || "").toString();
  const getStatus = (o) => (o.status || "").toString().toLowerCase();
  const getUser = (o) => (userNameFrom(o) || "").toString().toLowerCase();
  const getItems = (o) => safeItemsCount(o);
  switch (sort) {
    case "newest": copy.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")); break;
    case "oldest": copy.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")); break;
    case "amount_asc": copy.sort((a, b) => getAmount(a) - getAmount(b)); break;
    case "amount_desc": copy.sort((a, b) => getAmount(b) - getAmount(a)); break;
    case "status_asc": copy.sort((a, b) => getStatus(a).localeCompare(getStatus(b))); break;
    case "status_desc": copy.sort((a, b) => getStatus(b).localeCompare(getStatus(a))); break;
    case "items_asc": copy.sort((a, b) => getItems(a) - getItems(b)); break;
    case "items_desc": copy.sort((a, b) => getItems(b) - getItems(a)); break;
    case "user_asc": copy.sort((a, b) => getUser(a).localeCompare(getUser(b))); break;
    case "user_desc": copy.sort((a, b) => getUser(b).localeCompare(getUser(a))); break;
    case "delivery_asc": copy.sort((a, b) => getDate(a).localeCompare(getDate(b))); break;
    case "delivery_desc": copy.sort((a, b) => getDate(b).localeCompare(getDate(a))); break;
    default: break;
  }
  return copy;
};

/**
 * Address formatting helpers (handles strings, objects and arrays)
 */
const formatShippingAddressParts = (addr) => {
  if (!addr) return null;

  // plain string
  if (typeof addr === "string" && addr.trim()) return { lines: [addr.trim()] };

  // array of addresses -> take first element
  if (Array.isArray(addr) && addr.length) {
    const first = addr[0];
    if (typeof first === "string" && first.trim()) return { lines: [first.trim()] };
    addr = first;
  }

  if (typeof addr === "object") {
    const lines = [];
    if (addr.name) lines.push(String(addr.name).trim());
    if (addr.address) lines.push(String(addr.address).trim());
    const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
    if (cityState) lines.push(cityState);
    const pin = addr.pincode ?? addr.postal ?? addr.zip;
    if (pin) lines.push(String(pin).trim());
    if (addr.country) lines.push(String(addr.country).trim());
    const phone = addr.phone ?? addr.mobile;
    if (phone) lines.push("Phone: " + String(phone).trim());
    if (lines.length) return { lines };
  }

  return null;
};

const formatShippingAddressForDisplay = (o) => {
  if (!o) return "-";
  const full = o.shipping_address_full ?? o.shipping_address;
  if (typeof full === "string" && full.trim()) return full.trim();

  const parts =
    formatShippingAddressParts(full) ||
    formatShippingAddressParts(o.shipping) ||
    formatShippingAddressParts(o.address) ||
    formatShippingAddressParts(o.shipping_address);

  if (parts?.lines?.length) return parts.lines.join(", ");

  const manual = [o.address_line1, o.address_line2, o.city, o.state, o.pincode, o.country]
    .filter(Boolean)
    .map(s => String(s).trim());
  if (manual.length) return manual.join(", ");

  const altParts = [o.ship_addr_1, o.ship_addr_2, o.ship_city, o.ship_state, o.ship_pincode].filter(Boolean);
  if (altParts.length) return altParts.join(", ");

  return "-";
};

const getShippingAddress = (o) => formatShippingAddressForDisplay(o);

// -----------------------------
// Component
// -----------------------------
export default function OrderManagement() {
  // tabs
  const [activeTab, setActiveTab] = useState("browse");

  // stats tab selection
  const [statsTab, setStatsTab] = useState("overall"); // overall, monthly, weekly, day
  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  // week input default (most browsers supply format 'YYYY-Www'), compute current week if possible:
  const getCurrentWeekValue = () => {
    try {
      const d = new Date();
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7; // Monday=0..Sunday=6
      target.setDate(d.getDate() - dayNr + 3);
      const firstThursday = new Date(target.getFullYear(), 0, 4);
      const diff = (target - firstThursday) / 86400000;
      const week = 1 + Math.round(diff / 7);
      const yyyy = target.getFullYear();
      const weekStr = String(week).padStart(2, "0");
      return `${yyyy}-W${weekStr}`;
    } catch {
      return "";
    }
  };
  const [statsDay, setStatsDay] = useState(todayIso);
  const [statsMonth, setStatsMonth] = useState(currentMonth);
  const [statsWeek, setStatsWeek] = useState(getCurrentWeekValue());

  // stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    confirmedOrders: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalSales: 0,
    totalItemsSold: 0,
  });

  // browse
  const [orders, setOrders] = useState([]);
  const [browseQ, setBrowseQ] = useState("");
  const [browseSort, setBrowseSort] = useState("newest");
  const [browseLimit, setBrowseLimit] = useState("20"); // "10","20","50","100","all"
  const [browsePage, setBrowsePage] = useState(1);
  const [browseTotalPages, setBrowseTotalPages] = useState(null); // null = unknown
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);

  // update
  const [updateOrders, setUpdateOrders] = useState([]);
  const [updateQ, setUpdateQ] = useState("");
  const [updateSort, setUpdateSort] = useState("newest");
  const [updateLimit, setUpdateLimit] = useState("20");
  const [updatePage, setUpdatePage] = useState(1);
  const [updateTotalPages, setUpdateTotalPages] = useState(null);
  const [updateHasMore, setUpdateHasMore] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // selected order
  const [selectedOrder, setSelectedOrder] = useState(null);

  // bulk
  const [bulkRows, setBulkRows] = useState([{ value: "", status: STATUS_OPTIONS[1] }]);
  const bulkInputRefs = useRef({});
  const [bulkCsv, setBulkCsv] = useState(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [globalBulkStatus, setGlobalBulkStatus] = useState(STATUS_OPTIONS[1]);

  // caches & abort refs
  const userNameCache = useRef({});
  const statsAbort = useRef(null);
  const browseAbort = useRef(null);
  const updateAbort = useRef(null);

  // -----------------------------
  // fetch items for orders missing them (to populate item counts)
  // -----------------------------
  const fetchOrderItemsForList = async (list = []) => {
    const toFetch = list.filter((o) => safeItemsCount(o) === 0 && o?.id).map((o) => o.id);
    if (!toFetch.length) return;
    if (DEBUG) console.debug("fetch items for:", toFetch);
    const endpoints = ["/api/admin/orders", "/api/orders", "/orders"];
    const promises = toFetch.map(async (id) => {
      for (const base of endpoints) {
        try {
          const baseClean = base.endsWith('/') ? base.slice(0, -1) : base;
          const url = `${baseClean}/${id}`;
          const res = await api.get(url, {}, true);
          if (!res) continue;
          const body = normalize(res);
          const items = body?.items ?? body?.order_items ?? body?.data?.items ?? body?.line_items ?? null;
          const count = (Array.isArray(items) && items.length) || Number(body?.items_count ?? body?.item_count ?? 0) || 0;
          return { id, items: items || (count ? new Array(count) : null), items_count: count };
        } catch (err) {
          if (DEBUG) console.debug("single order fetch failed", base, id, err);
        }
      }
      return null;
    });

    const settled = await Promise.allSettled(promises);
    const updates = settled.filter(s => s.status === "fulfilled" && s.value).map(s => s.value);
    if (!updates.length) return;

    setOrders(prev => prev.map(o => {
      const u = updates.find(x => String(x.id) === String(o.id));
      if (!u) return o;
      return { ...o, items: u.items ?? o.items, items_count: u.items_count ?? o.items_count };
    }));
    setUpdateOrders(prev => prev.map(o => {
      const u = updates.find(x => String(x.id) === String(o.id));
      if (!u) return o;
      return { ...o, items: u.items ?? o.items, items_count: u.items_count ?? o.items_count };
    }));
  };

  // -----------------------------
  // fetchers
  // -----------------------------
  const fetchStatsForTab = async (tab = "overall") => {
    try {
      // build params for each tab
      const candidate = ["/api/admin/orders/stats", "/api/admin/stats", "/api/orders/stats"];
      let params = {};
      if (tab === "monthly") {
        params = { month: statsMonth }; // YYYY-MM
      } else if (tab === "weekly") {
        params = { week: statsWeek }; // format YYYY-Www (from input)
      } else if (tab === "day") {
        params = { date: statsDay }; // YYYY-MM-DD
      } else {
        params = {}; // overall
      }

      if (DEBUG) console.debug(`[fetchStatsForTab] requesting stats tab=${tab} params=${serializeParamsForLog(params)}`);
      const res = await tryGetMany(candidate, params);
      const body = normalize(res);
      if (DEBUG) console.debug("stats:", body);
      setStats({
        totalOrders: Number(body.totalOrders ?? body.total ?? 0),
        confirmedOrders: Number(body.confirmedOrders ?? body.confirmed ?? 0),
        pendingOrders: Number(body.pendingOrders ?? body.pending ?? 0),
        shippedOrders: Number(body.shippedOrders ?? body.shipped ?? 0),
        deliveredOrders: Number(body.deliveredOrders ?? body.delivered ?? 0),
        cancelledOrders: Number(body.cancelledOrders ?? body.cancelled ?? 0),
        totalSales: Number(body.totalSales ?? body.total_sales ?? 0),
        totalItemsSold: Number(body.totalItemsSold ?? body.total_items_sold ?? 0),
      });
    } catch (e) {
      if (DEBUG) console.error("fetchStatsForTab err", e);
    }
  };

  // Helper: build params for search. If query is numeric, prefer orderId param (exact)
  const buildSearchParams = (page, limit, search, sort) => {
    const params = { page: Number(page || 1) };

    if (limit !== "all") params.limit = Number(limit || 20);
    else params.limit = "all";

    if (typeof search === "string" && search.trim()) {
      const s = search.trim();
      if (/^[0-9]+$/.test(s)) {
        params.orderId = s;
      } else {
        params.search = s;
      }
    }

    if (sort) params.sort = sort;
    return params;
  };

  const fetchOrders = async ({ page = browsePage, limit = browseLimit, search = browseQ, sort = browseSort } = {}) => {
    setBrowsePage(page);
    browseAbort.current?.abort?.();
    browseAbort.current = new AbortController();
    setBrowseLoading(true);

    try {
      const candidate = ["/api/admin/orders"];

      // If the search is numeric, attempt exact orderId fetch first
      if (typeof search === "string" && /^[0-9]+$/.test(search.trim())) {
        const s = search.trim();
        try {
          const singleParams = { page: 1, limit: 1, orderId: s };
          if (DEBUG) console.debug(`[fetchOrders] trying exact orderId fetch: ${serializeParamsForLog(singleParams)}`);
          const resSingle = await tryGetMany(candidate, singleParams);
          const bodySingle = normalize(resSingle);
          let singleList = [];
          if (Array.isArray(bodySingle)) singleList = bodySingle;
          else if (Array.isArray(bodySingle.data)) singleList = bodySingle.data;
          else if (Array.isArray(bodySingle.orders)) singleList = bodySingle.orders;
          else if (bodySingle && bodySingle.id) singleList = [bodySingle];

          if (singleList.length > 0) {
            const sorted = sortOrdersClient(singleList, sort);
            setOrders(sorted);
            const numericLimit = limit === "all" ? null : Number(limit) || 20;
            const total = Number(bodySingle.total ?? singleList.length ?? 1);
            const totalPages = typeof bodySingle.totalPages === "number"
              ? bodySingle.totalPages
              : (numericLimit ? Math.max(1, Math.ceil(total / numericLimit)) : 1);
            setBrowseTotalPages(totalPages);
            setBrowseHasMore(numericLimit ? page < totalPages : false);

            fetchMissingUserNames(sorted);
            await fetchOrderItemsForList(sorted);
            fetchStatsForTab(statsTab);
            return;
          }
        } catch (err) {
          if (DEBUG) console.debug("exact orderId fetch failed, will fallback to search", err);
        }
      }

      // Normal fetch (non-numeric search or fallback after numeric attempt)
      const params = buildSearchParams(page, limit, search, sort);
      if (typeof search === "string" && /^[0-9]+$/.test(search.trim())) {
        params.search = search.trim();
        delete params.orderId;
      }

      if (DEBUG) console.debug(`[fetchOrders] requesting ${candidate[0]}?${serializeParamsForLog(params)}`);

      const res = await tryGetMany(candidate, params);
      const body = normalize(res);
      if (DEBUG) console.debug("fetchOrders body:", body);

      let list = [];
      let total = null;

      if (Array.isArray(body)) {
        list = body;
      } else if (Array.isArray(body.data)) {
        list = body.data;
        total = Number(body.total ?? body.totalCount ?? null);
      } else if (Array.isArray(body.orders)) {
        list = body.orders;
        total = Number(body.total ?? body.totalCount ?? null);
      } else if (body && typeof body === 'object') {
        const arr = body.orders || body.data || Object.values(body).find(v => Array.isArray(v));
        list = Array.isArray(arr) ? arr : [];
        total = Number(body.total ?? body.totalCount ?? null);
      }

      const sorted = sortOrdersClient(list, sort);
      setOrders(sorted || []);

      // pagination metadata
      if (limit === "all") {
        setBrowseTotalPages(1);
        setBrowseHasMore(false);
      } else {
        const numericLimit = Number(limit) || 20;
        if (body && typeof body.totalPages === "number") {
          setBrowseTotalPages(body.totalPages);
          setBrowseHasMore(page < body.totalPages);
        } else if (Number.isFinite(total) && total > 0) {
          const pages = Math.max(1, Math.ceil(total / numericLimit));
          setBrowseTotalPages(pages);
          setBrowseHasMore(page < pages);
        } else {
          setBrowseHasMore((sorted || []).length === numericLimit);
          setBrowseTotalPages(null);
        }
      }

      fetchMissingUserNames(sorted);
      await fetchOrderItemsForList(sorted);
      fetchStatsForTab(statsTab);
    } catch (e) {
      if (DEBUG) console.error("fetchOrders err", e);
      setOrders([]);
      setBrowseTotalPages(null);
      setBrowseHasMore(false);
    } finally { setBrowseLoading(false); }
  };

  const fetchUpdateOrders = async ({ page = updatePage, limit = updateLimit, search = updateQ, sort = updateSort } = {}) => {
    setUpdatePage(page);
    updateAbort.current?.abort?.();
    updateAbort.current = new AbortController();
    setUpdateLoading(true);
    try {
      const candidate = ["/api/admin/orders", "/api/orders", "/orders"];

      // numeric-first attempt
      if (typeof search === "string" && /^[0-9]+$/.test(search.trim())) {
        const s = search.trim();
        try {
          const resSingle = await tryGetMany(candidate, { page: 1, limit: 1, orderId: s });
          const bodySingle = normalize(resSingle);
          let singleList = [];
          if (Array.isArray(bodySingle)) singleList = bodySingle;
          else if (Array.isArray(bodySingle.data)) singleList = bodySingle.data;
          else if (Array.isArray(bodySingle.orders)) singleList = bodySingle.orders;
          else if (bodySingle && bodySingle.id) singleList = [bodySingle];

          if (singleList.length > 0) {
            const sorted = sortOrdersClient(singleList, sort);
            setUpdateOrders(sorted);
            const numericLimit = limit === "all" ? null : Number(limit) || 20;
            const total = Number(bodySingle.total ?? singleList.length ?? 1);
            const totalPages = typeof bodySingle.totalPages === "number"
              ? bodySingle.totalPages
              : (numericLimit ? Math.max(1, Math.ceil(total / numericLimit)) : 1);
            setUpdateTotalPages(totalPages);
            setUpdateHasMore(numericLimit ? page < totalPages : false);
            fetchMissingUserNames(sorted);
            await fetchOrderItemsForList(sorted);
            fetchStatsForTab(statsTab);
            return;
          }
        } catch (err) {
          if (DEBUG) console.debug("exact orderId fetch failed for update tab, will fallback", err);
        }
      }

      // normal fetch
      const params = buildSearchParams(page, limit, search, sort);
      if (typeof search === "string" && /^[0-9]+$/.test(search.trim())) {
        params.search = search.trim();
        delete params.orderId;
      }

      if (DEBUG) console.debug(`[fetchUpdateOrders] requesting ${candidate[0]}?${serializeParamsForLog(params)}`);

      const res = await tryGetMany(candidate, params);
      const body = normalize(res);
      if (DEBUG) console.debug("fetchUpdateOrders body:", body);

      let list = [];
      let total = null;

      if (Array.isArray(body)) {
        list = body;
      } else if (Array.isArray(body.data)) {
        list = body.data; total = Number(body.total ?? body.totalCount ?? null);
      } else if (Array.isArray(body.orders)) {
        list = body.orders; total = Number(body.total ?? body.totalCount ?? null);
      } else if (body && typeof body === 'object') {
        const arr = body.orders || body.data || Object.values(body).find(v => Array.isArray(v));
        list = Array.isArray(arr) ? arr : [];
        total = Number(body.total ?? body.totalCount ?? null);
      }

      const sorted = sortOrdersClient(list, sort);
      setUpdateOrders(sorted || []);

      if (limit === "all") {
        setUpdateTotalPages(1);
        setUpdateHasMore(false);
      } else {
        const numericLimit = Number(limit) || 20;
        if (body && typeof body.totalPages === "number") {
          setUpdateTotalPages(body.totalPages);
          setUpdateHasMore(page < body.totalPages);
        } else if (Number.isFinite(total) && total > 0) {
          const pages = Math.max(1, Math.ceil(total / numericLimit));
          setUpdateTotalPages(pages);
          setUpdateHasMore(page < pages);
        } else {
          setUpdateHasMore((sorted || []).length === numericLimit);
          setUpdateTotalPages(null);
        }
      }

      fetchMissingUserNames(sorted);
      await fetchOrderItemsForList(sorted);
      fetchStatsForTab(statsTab);
    } catch (e) {
      if (DEBUG) console.error("fetchUpdateOrders err", e);
      setUpdateOrders([]);
      setUpdateTotalPages(null);
      setUpdateHasMore(false);
    } finally { setUpdateLoading(false); }
  };

  // fetch missing user names (caches results)
  const fetchMissingUserNames = async (list = []) => {
    try {
      const missingIds = new Set();
      for (const o of list) {
        const uid = o?.user_id ?? (o.user && o.user.id);
        const name = userNameFrom(o);
        if (uid && (!name || name === "")) {
          if (!userNameCache.current[uid]) missingIds.add(uid);
        }
      }
      if (!missingIds.size) return;

      for (const uid of Array.from(missingIds)) {
        try {
          const candidate = [`/api/admin/users/${uid}`, `/api/users/${uid}`, `/api/users?id=${uid}`];
          const res = await tryGetMany(candidate, {});
          const body = normalize(res);
          const fetchedName = body?.name ?? body?.full_name ?? body?.user?.name ?? body?.username ?? null;
          if (fetchedName) {
            userNameCache.current[uid] = fetchedName;
            setOrders(prev => prev.map(p => (String(p.user_id) === String(uid) || (p.user && String(p.user.id) === String(uid))) ? { ...p, user_name: fetchedName } : p));
            setUpdateOrders(prev => prev.map(p => (String(p.user_id) === String(uid) || (p.user && String(p.user.id) === String(uid))) ? { ...p, user_name: fetchedName } : p));
          }
        } catch (e) {
          if (DEBUG) console.warn("user fetch failed for", uid, e);
        }
      }
    } catch (e) {
      if (DEBUG) console.error(e);
    }
  };

  // -----------------------------
  // mount & effects
  // -----------------------------
  useEffect(() => {
    (async () => {
      await Promise.allSettled([fetchStatsForTab(statsTab), fetchOrders(), fetchUpdateOrders()]);
    })();
    // eslint-disable-next-line
  }, []);

  // re-fetch stats when statsTab or selectors change
  useEffect(() => {
    fetchStatsForTab(statsTab);
    // eslint-disable-next-line
  }, [statsTab, statsDay, statsMonth, statsWeek]);

  // When tab changes, load appropriate data.
  useEffect(() => {
    if (activeTab === "browse") fetchOrders();
    if (activeTab === "update") fetchUpdateOrders();
    // eslint-disable-next-line
  }, [activeTab]);

  // re-fetch browse/update when their pagination/search changes
  useEffect(() => { if (activeTab === "browse") fetchOrders({ page: browsePage, limit: browseLimit, search: browseQ, sort: browseSort }); }, [browsePage, browseLimit, browseQ, browseSort]);
  useEffect(() => { if (activeTab === "update") fetchUpdateOrders({ page: updatePage, limit: updateLimit, search: updateQ, sort: updateSort }); }, [updatePage, updateLimit, updateQ, updateSort]);

  // -----------------------------
  // actions
  // -----------------------------
  const viewOrder = (o) => setSelectedOrder(o);

  const copyOrderId = async (id) => {
    try {
      await navigator.clipboard.writeText(String(id));
      alert("Order ID copied to clipboard.");
    } catch {
      alert("Could not copy. Select and copy manually.");
    }
  };

  const updateOrderStatus = async (id, status) => {
    try {
      setStatusUpdatingId(id);
      const candidate = [`/api/admin/orders/${id}`, `/api/orders/${id}`, `/orders/${id}`];
      let ok = false;
      for (const u of candidate) {
        try {
          await api.patch(u, { status }, true);
          ok = true; break;
        } catch (err) {
          if (DEBUG) console.debug("patch failed", u, err);
          try { await api.put(u, { status }, true); ok = true; break; } catch { }
        }
      }
      if (!ok) throw new Error("Could not update");
      await Promise.allSettled([fetchStatsForTab(statsTab), fetchOrders(), fetchUpdateOrders()]);
    } catch (e) {
      alert("Could not update order status. Check console.");
      if (DEBUG) console.error(e);
    } finally { setStatusUpdatingId(null); }
  };

  // BULK handlers (kept robust)
  const handleBulkChange = (idx, val) => {
    const next = [...bulkRows];
    next[idx] = { ...(next[idx] || { value: "", status: STATUS_OPTIONS[1] }), value: val };
    setBulkRows(next);
  };
  const handleBulkStatusChange = (idx, status) => {
    const next = [...bulkRows];
    next[idx] = { ...(next[idx] || { value: "", status: STATUS_OPTIONS[1] }), status };
    setBulkRows(next);
  };
  const handleBulkKeyDown = (e, idx) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = [...bulkRows];
      const cur = next[idx];
      if (cur && (cur.value || "").trim() !== "") {
        next.splice(idx + 1, 0, { value: "", status: globalBulkStatus });
        setBulkRows(next);
        setTimeout(() => { bulkInputRefs.current[idx + 1]?.focus(); }, 0);
      }
    }
  };
  const removeBulkRow = (idx) => {
    const next = [...bulkRows];
    next.splice(idx, 1);
    if (!next.length) next.push({ value: "", status: globalBulkStatus });
    setBulkRows(next);
  };
  const applyGlobalStatusToAllRows = () => setBulkRows(prev => prev.map(r => ({ ...(r || {}), status: globalBulkStatus })));

  const doBulkUpdate = async () => {
    const rows = bulkRows.map(r => ({ value: (r?.value || "").trim(), status: r?.status || globalBulkStatus })).filter(r => r.value);
    if (!rows.length) return alert("Enter at least one ID.");
    const idsByStatus = {};
    for (const r of rows) {
      const id = Number(r.value);
      if (!Number.isFinite(id)) continue;
      idsByStatus[r.status] = idsByStatus[r.status] || [];
      idsByStatus[r.status].push(id);
    }
    if (!Object.keys(idsByStatus).length) return alert("No valid numeric IDs.");
    setBulkUpdating(true);
    try {
      const candidateBulk = [
        { method: "post", url: "/api/admin/orders/bulk-update", key: "ids" },
        { method: "put", url: "/api/admin/orders/bulk-update", key: "ids" },
        { method: "post", url: "/api/admin/orders/bulk-update", key: "orderIds" },
        { method: "put", url: "/api/admin/orders/bulk-update", key: "orderIds" },
        { method: "post", url: "/api/orders/bulk-update", key: "ids" },
        { method: "put", url: "/api/orders/bulk-update", key: "ids" },
      ];
      for (const [status, ids] of Object.entries(idsByStatus)) {
        let ok = false;
        for (const attempt of candidateBulk) {
          try {
            const bodyA = { [attempt.key]: ids, status };
            if (attempt.method === "post") await api.post(attempt.url, bodyA, true);
            else await api.put(attempt.url, bodyA, true);
            ok = true; break;
          } catch (err) { if (DEBUG) console.debug("bulk attempt failed", attempt, err); }
        }
        if (!ok) throw new Error("Bulk endpoint failed for " + status);
      }
      setBulkRows([{ value: "", status: globalBulkStatus }]);
      await Promise.allSettled([fetchStatsForTab(statsTab), fetchOrders(), fetchUpdateOrders()]);
      alert("Bulk update completed.");
    } catch (e) {
      alert("Bulk update failed. Check console.");
      if (DEBUG) console.error(e);
    } finally { setBulkUpdating(false); }
  };

  const onCsvUpload = async (file) => {
    setBulkCsv(file);
    const text = await file.text().catch(() => "");
    const idsRaw = text.split("\n")
      .map(r => r.split(",")[0]?.trim())
      .filter(Boolean);

    if (!idsRaw.length) return alert("No IDs found in CSV.");
    const status = window.prompt("Enter status to set for CSV IDs:");
    if (!status) return;
    const ids = idsRaw.map(s => Number(s)).filter(n => Number.isFinite(n));
    if (!ids.length) return alert("No numeric IDs found in CSV.");
    setBulkUpdating(true);
    try {
      const candidateBulk = [
        { method: "post", url: "/api/admin/orders/bulk-update", key: "ids" },
        { method: "put", url: "/api/admin/orders/bulk-update", key: "ids" },
        { method: "post", url: "/api/admin/orders/bulk-update", key: "orderIds" },
        { method: "put", url: "/api/admin/orders/bulk-update", key: "orderIds" },
      ];
      let ok = false;
      for (const attempt of candidateBulk) {
        try {
          const bodyA = { [attempt.key]: ids, status };
          if (attempt.method === "post") await api.post(attempt.url, bodyA, true);
          else await api.put(attempt.url, bodyA, true);
          ok = true; break;
        } catch (err) { if (DEBUG) console.debug("csv bulk attempt failed", attempt, err); }
      }
      if (!ok) throw new Error("CSV bulk endpoint failed");
      setBulkCsv(null);
      setBulkRows([{ value: "", status: globalBulkStatus }]);
      await Promise.allSettled([fetchStatsForTab(statsTab), fetchOrders(), fetchUpdateOrders()]);
      alert("CSV update complete.");
    } catch (e) {
      alert("CSV update failed. Check console.");
      if (DEBUG) console.error(e);
    } finally { setBulkUpdating(false); }
  };

  // -----------------------------
  // UI helper styles
  // -----------------------------
  const statCards = [
    { label: "Total Orders", value: stats.totalOrders, icon: ClipboardList, color: "bg-green-500" },
    { label: "Confirmed", value: stats.confirmedOrders, icon: CheckCircle2, color: "bg-blue-500" },
    { label: "Pending", value: stats.pendingOrders, icon: PackageSearch, color: "bg-yellow-500" },
    { label: "Shipped", value: stats.shippedOrders, icon: Truck, color: "bg-indigo-500" },
    { label: "Delivered", value: stats.deliveredOrders, icon: CheckCircle2, color: "bg-teal-500" },
    { label: "Cancelled", value: stats.cancelledOrders, icon: XCircle, color: "bg-red-500" },
  ];

  // NOTE: date inputs intentionally force white background + dark text so the native calendar icon is visible in dark mode.
  const dateInputClass = "pl-3 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white text-black";

  const lightInput = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white";
  const lightSelect = "px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white";
  const btnPrimary = "px-3 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-90";
  const btnSecondaryBase = "px-4 py-2 rounded-xl border hover:opacity-90";
  const btnSecondaryLight = "bg-white text-black border-gray-300";
  const btnSecondaryDark = "dark:bg-black dark:text-white dark:border-gray-700";

  // Helper render for pagination controls (browse/update share same UI pattern)
  const PaginationControls = ({ page, totalPages, hasMore, onPrev, onNext, onFirst, onLast, setPage }) => {
    return (
      <div className="flex items-center justify-center gap-3 pt-2">
        <button disabled={page === 1} onClick={() => onFirst && onFirst()} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>First</button>
        <button disabled={page === 1} onClick={() => onPrev && onPrev()} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><ChevronLeft className="w-4 h-4 inline-block" /> Prev</button>
        <div className="text-sm">Page {page}{totalPages ? ` of ${totalPages}` : ""}</div>

        {totalPages && totalPages > 1 && (
          <select value={page} onChange={e => setPage(Number(e.target.value))} className={`${lightSelect} ml-2`}>
            {Array.from({ length: totalPages }).map((_, i) => <option key={i+1} value={i+1}>Go to {i+1}</option>)}
          </select>
        )}

        <button disabled={!hasMore} onClick={() => onNext && onNext()} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>Next <ChevronRight className="w-4 h-4 inline-block" /></button>
        <button disabled={!totalPages || page === totalPages} onClick={() => onLast && onLast()} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>Last</button>
      </div>
    );
  };

  // -----------------------------
  // render
  // -----------------------------
  return (
    <div className="space-y-6">
      {/* Stats Tabs */}
      <div className="rounded-2xl p-4 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex gap-3 items-center mb-4">
          {/* Active tab: black background in light mode, white background in dark mode */}
          <button
            onClick={() => setStatsTab("overall")}
            className={`flex items-center gap-2 ${statsTab === "overall"
              ? "px-4 py-2 rounded-xl bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white"
              : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark} text-gray-700 dark:text-gray-200`}`}
          >
            <BarChart3 className="w-4 h-4 inline" /> <span>Overall</span>
          </button>

          <button
            onClick={() => setStatsTab("monthly")}
            className={`flex items-center gap-2 ${statsTab === "monthly"
              ? "px-4 py-2 rounded-xl bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white"
              : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark} text-gray-700 dark:text-gray-200`}`}
          >
            <PackageSearch className="w-4 h-4 inline" /> <span>Monthly</span>
          </button>

          <button
            onClick={() => setStatsTab("weekly")}
            className={`flex items-center gap-2 ${statsTab === "weekly"
              ? "px-4 py-2 rounded-xl bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white"
              : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark} text-gray-700 dark:text-gray-200`}`}
          >
            <ClipboardList className="w-4 h-4 inline" /> <span>Weekly</span>
          </button>

          <button
            onClick={() => setStatsTab("day")}
            className={`flex items-center gap-2 ${statsTab === "day"
              ? "px-4 py-2 rounded-xl bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white"
              : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark} text-gray-700 dark:text-gray-200`}`}
          >
            {/* Day wise uses Calendar icon now */}
            <Calendar className="w-4 h-4 inline" /> <span>Day Wise</span>
          </button>

          <div className="ml-auto flex gap-3 items-center">
            {/* Date selectors — removed custom calendar icon to rely on native browser icon.
                Force white background + dark text for these inputs so the native calendar icon is visible in dark mode. */}
            {statsTab === "monthly" && (
              <input
                type="month"
                value={statsMonth}
                onChange={(e) => setStatsMonth(e.target.value)}
                className={`${dateInputClass}`}
                // ensure native appearance where supported (helps icon visibility in some browsers)
                style={{ WebkitAppearance: "textfield", MozAppearance: "textfield", appearance: "auto" }}
              />
            )}

            {statsTab === "weekly" && (
              <input
                type="week"
                value={statsWeek}
                onChange={(e) => setStatsWeek(e.target.value)}
                className={`${dateInputClass}`}
                style={{ WebkitAppearance: "textfield", MozAppearance: "textfield", appearance: "auto" }}
              />
            )}

            {statsTab === "day" && (
              <input
                type="date"
                value={statsDay}
                onChange={(e) => setStatsDay(e.target.value)}
                className={`${dateInputClass}`}
                style={{ WebkitAppearance: "textfield", MozAppearance: "textfield", appearance: "auto" }}
              />
            )}

            <button onClick={() => fetchStatsForTab(statsTab)} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>Refresh</button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div>
                <div className="text-sm text-gray-700 dark:text-gray-300">{s.label}</div>
                <div className="mt-2 text-3xl font-extrabold text-black dark:text-white">{s.value}</div>
              </div>
              <div className={`p-3 rounded-full ${s.color} text-white`}><s.icon className="w-6 h-6" /></div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 items-center flex-wrap">
        <button onClick={() => setActiveTab("browse")} className={activeTab === "browse" ? "px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white" : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><Eye className="w-4 h-4 inline mr-2" /> Browse Orders</button>
        <button onClick={() => setActiveTab("update")} className={activeTab === "update" ? "px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white" : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><Edit className="w-4 h-4 inline mr-2" /> Update Orders</button>
        <button onClick={() => setActiveTab("bulk")} className={activeTab === "bulk" ? "px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white" : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><Upload className="w-4 h-4 inline mr-2" /> Bulk Update</button>
      </div>

      {/* BROWSE */}
      {activeTab === "browse" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <input className={lightInput} value={browseQ} onChange={e => { setBrowseQ(e.target.value); setBrowsePage(1); }} placeholder="Search orders (id / user / status)" />
            <div className="flex gap-3">
              <select value={browseSort} onChange={e => { setBrowseSort(e.target.value); setBrowsePage(1); }} className={lightSelect}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="amount_asc">Amount Low → High</option>
                <option value="amount_desc">Amount High → Low</option>
                <option value="status_asc">Status A → Z</option>
                <option value="status_desc">Status Z → A</option>
                <option value="items_asc">Items ↑</option>
                <option value="items_desc">Items ↓</option>
                <option value="user_asc">User A → Z</option>
                <option value="user_desc">User Z → A</option>
                <option value="delivery_desc">Delivery ↓</option>
                <option value="delivery_asc">Delivery ↑</option>
              </select>
              <select value={browseLimit} onChange={e => { setBrowseLimit(e.target.value); setBrowsePage(1); }} className={lightSelect}>
                {[10, 20, 50, 100].map(n => <option key={n} value={String(n)}>{n} / page</option>)}<option value={"all"}>Show All</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr className="text-left">
                  <th className="p-3">Order ID</th>
                  <th className="p-3">User ID</th>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {browseLoading ? <tr><td colSpan={7} className="p-4 text-center">Loading…</td></tr>
                  : orders.length === 0 ? <tr><td colSpan={7} className="p-4 text-center">No orders</td></tr>
                    : orders.map(o => (
                      <tr key={o.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3">{o.id}</td>
                        <td className="p-3">{userIdFrom(o)}</td>
                        <td className="p-3">{userNameFrom(o) || userNameCache.current[userIdFrom(o)] || `User ${userIdFrom(o)}`}</td>
                        <td className="p-3">{safeItemsCount(o)}</td>
                        <td className="p-3">{formatCurrency(Number(o.total_amount ?? o.amount ?? 0))}</td>
                        <td className="p-3">{o.status}</td>
                        <td className="p-3"><button onClick={() => viewOrder(o)} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><Eye className="w-4 h-4 inline mr-1" /> View</button></td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination controls: show when not 'all' */}
          {browseLimit !== "all" && (
            <PaginationControls
              page={browsePage}
              totalPages={browseTotalPages}
              hasMore={browseHasMore}
              onPrev={() => setBrowsePage(p => Math.max(1, p - 1))}
              onNext={() => setBrowsePage(p => p + 1)}
              onFirst={() => setBrowsePage(1)}
              onLast={() => browseTotalPages && setBrowsePage(browseTotalPages)}
              setPage={(n) => setBrowsePage(n)}
            />
          )}

          {selectedOrder && (
            <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center sm:justify-center">
              <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="text-xl font-semibold">Order #{selectedOrder.id}</div>
                  <div className="flex gap-2">
                    <button onClick={() => copyOrderId(selectedOrder.id)} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><Copy className="w-4 h-4 inline mr-1" />Copy ID</button>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">User</div>
                    <div className="flex items-center gap-2 mt-1"><User2 className="w-4 h-4" /> {userNameFrom(selectedOrder) || `User ${userIdFrom(selectedOrder)}`}</div>
                    <div className="mt-3 font-medium">Delivery Date</div>
                    <div>{deliveryDateFrom(selectedOrder) || "-"}</div>
                    <div className="mt-3 font-medium">Status</div>
                    <div>{selectedOrder.status}</div>
                  </div>
                  <div>
                    <div className="font-medium">Items</div>
                    <div>{Array.isArray(selectedOrder.items) ? selectedOrder.items.length : ((Number(selectedOrder.items_count ?? selectedOrder.item_count ?? 0)) || (selectedOrder.items ?? 0))}</div>
                    <div className="mt-3 font-medium">Amount</div>
                    <div>{formatCurrency(Number(selectedOrder.total_amount ?? selectedOrder.amount ?? 0))}</div>
                    <div className="mt-3 font-medium">Instructions</div>
                    <div>{selectedOrder.instructions ?? selectedOrder.shipping_instructions ?? "-"}</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setSelectedOrder(null)} className={btnPrimary}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UPDATE */}
      {activeTab === "update" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <input value={updateQ} onChange={e => { setUpdateQ(e.target.value); setUpdatePage(1); }} placeholder="Search orders (id / user / status)" className={lightInput} />
            <div className="flex gap-3">
              <select value={updateSort} onChange={e => { setUpdateSort(e.target.value); setUpdatePage(1); }} className={lightSelect}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="amount_asc">Amount Low → High</option>
                <option value="amount_desc">Amount High → Low</option>
                <option value="status_asc">Status A → Z</option>
                <option value="status_desc">Status Z → A</option>
                <option value="items_asc">Items ↑</option>
                <option value="items_desc">Items ↓</option>
                <option value="user_asc">User A → Z</option>
                <option value="user_desc">User Z → A</option>
              </select>
              <select value={updateLimit} onChange={e => { setUpdateLimit(e.target.value); setUpdatePage(1); }} className={lightSelect}>
                {[10, 20, 50, 100].map(n => <option key={n} value={String(n)}>{n} / page</option>)}<option value={"all"}>Show All</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800"><tr className="text-left"><th className="p-3">Order ID</th><th className="p-3">User ID</th><th className="p-3">User Name</th><th className="p-3">Items</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
              <tbody>
                {updateLoading ? <tr><td colSpan={7} className="p-4 text-center">Loading…</td></tr>
                  : updateOrders.length === 0 ? <tr><td colSpan={7} className="p-4 text-center">No orders</td></tr>
                    : updateOrders.map(o => (
                      <tr key={o.id} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3">{o.id}</td>
                        <td className="p-3">{userIdFrom(o)}</td>
                        <td className="p-3">{userNameFrom(o) || userNameCache.current[userIdFrom(o)] || `User ${userIdFrom(o)}`}</td>
                        <td className="p-3">{safeItemsCount(o)}</td>
                        <td className="p-3">{formatCurrency(Number(o.total_amount ?? o.amount ?? 0))}</td>
                        <td className="p-3">
                          <select disabled={statusUpdatingId === o.id} value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} className={lightSelect}>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-3"><button onClick={() => viewOrder(o)} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}><Eye className="w-4 h-4 inline mr-1" /> View</button></td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {updateLimit !== "all" && (
            <PaginationControls
              page={updatePage}
              totalPages={updateTotalPages}
              hasMore={updateHasMore}
              onPrev={() => setUpdatePage(p => Math.max(1, p - 1))}
              onNext={() => setUpdatePage(p => p + 1)}
              onFirst={() => setUpdatePage(1)}
              onLast={() => updateTotalPages && setUpdatePage(updateTotalPages)}
              setPage={(n) => setUpdatePage(n)}
            />
          )}
        </div>
      )}

      {/* BULK */}
      {activeTab === "bulk" && (
        <div className="space-y-4">
          <div className="text-sm">Scan/type an Order ID and press <b>Enter</b> to add a new row. You can apply a single status to all rows using the dropdown and "Apply to all" button.</div>
          <div className="flex items-center gap-3">
            <select value={globalBulkStatus} onChange={e => setGlobalBulkStatus(e.target.value)} className={lightSelect}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={applyGlobalStatusToAllRows} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>Apply status to all</button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bulkRows.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input ref={el => bulkInputRefs.current[i] = el} value={r.value || ""} onChange={e => handleBulkChange(i, e.target.value)} onKeyDown={e => handleBulkKeyDown(e, i)} placeholder={`Order ID #${i + 1}`} className={lightInput} />
                <select value={r.status || globalBulkStatus} onChange={e => handleBulkStatusChange(i, e.target.value)} className={lightSelect}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => removeBulkRow(i)} className="p-2 rounded-md border border-red-400 text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={doBulkUpdate} disabled={bulkUpdating} className={btnPrimary}>{bulkUpdating ? "Updating…" : "Bulk Update"}</button>
            <label className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>Upload CSV<input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && onCsvUpload(e.target.files[0])} /></label>
          </div>
        </div>
      )}
    </div>
  );
}
