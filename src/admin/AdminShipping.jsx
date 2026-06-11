import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Filter,
  LayoutDashboard,
  Loader2,
  Package,
  PackageCheck,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Undo2,
  X,
} from "lucide-react";

import ShippingTable from "../components/ShippingTable";
import ShipmentDetailsModal from "../components/ShipmentDetailsModal";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/$/, "");
const api = axios.create({
  baseURL: API_BASE ? `${API_BASE}/api/shipping` : "/api/shipping",
});

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function readApiError(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Request failed"
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value ?? "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function normalizeShiprocketOrder(order) {
  const shipment = Array.isArray(order?.shipments) ? order.shipments[0] : null;
  const products = Array.isArray(order?.products) ? order.products : [];
  const activities = Array.isArray(order?.activities) ? order.activities : [];

  return {
    raw: order,
    shiprocketOrderId: String(order?.id ?? ""),
    channelOrderId: String(
      pickFirst(order?.channel_order_id, order?.channelOrderId, order?.id) ?? ""
    ),
    channelId: order?.channel_id ?? "",
    channelName: order?.channel_name || "-",
    customerName: pickFirst(
      order?.customer_name,
      order?.shipping_customer_name,
      order?.pickup_customer_name,
      "-"
    ),
    customerEmail: pickFirst(order?.customer_email, order?.shipping_email, "-"),
    customerPhone: pickFirst(order?.customer_phone, order?.shipping_phone, "-"),
    pickupLocation: order?.pickup_location || "-",
    paymentStatus: order?.payment_status || "-",
    paymentMethod: order?.payment_method || "-",
    status: order?.status || "UNKNOWN",
    statusCode: order?.status_code ?? "-",
    shippingMethod: order?.shipping_method || "-",
    total: order?.total ?? "-",
    tax: order?.tax ?? "-",
    sla: order?.sla || "-",
    isInternational: order?.is_international ? "Yes" : "No",
    createdAt: order?.created_at || order?.channel_created_at || "-",
    fulfillmentStatus: order?.fulfillment_status || "-",
    shipmentId: shipment?.id ? String(shipment.id) : "",
    courierName: shipment?.courier || "-",
    awbCode: shipment?.awb || "-",
    returnAwb: shipment?.return_awb || "-",
    pickupTokenNumber: shipment?.pickup_token_number || "-",
    etd: shipment?.etd || "-",
    shipmentCount: Array.isArray(order?.shipments) ? order.shipments.length : 0,
    products,
    shipments: Array.isArray(order?.shipments) ? order.shipments : [],
    activities,
  };
}

function normalizeReturnOrder(item) {
  return {
    raw: item,
    orderId: pickFirst(item?.order_id, item?.return_order_id, item?.id, "-"),
    shipmentId: pickFirst(item?.shipment_id, item?.shipmentId, "-"),
    status: item?.status || item?.return_status || item?.state || "-",
    companyName: item?.company_name || "-",
    createdAt: item?.created_at || item?.createdAt || "-",
  };
}

function statusTone(status = "") {
  const s = String(status).toUpperCase();

  if (s.includes("DELIVERED")) return "emerald";
  if (s.includes("SHIPPED") || s.includes("IN TRANSIT")) return "sky";
  if (s.includes("OUT FOR DELIVERY") || s.includes("OFD")) return "amber";
  if (s.includes("RETURN") || s.includes("RTO")) return "violet";
  if (s.includes("CANCEL") || s.includes("FAILED")) return "rose";
  if (s.includes("NEW") || s.includes("CONFIRM") || s.includes("PACK")) return "slate";
  return "slate";
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
    sky: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
    amber: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
    violet: "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

function SectionShell({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h4 className="text-base font-bold text-slate-950 dark:text-white">{title}</h4>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, gradient }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900"
    >
      <div className={`bg-gradient-to-br ${gradient} p-5 text-white`}>
        <div className="flex items-center justify-between">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
            <Icon size={22} />
          </div>
          <ArrowUpRight size={18} className="opacity-90" />
        </div>
        <div className="mt-6">
          <h3 className="text-3xl font-black">{value}</h3>
          <p className="mt-1 text-sm/6 text-white/90">{title}</p>
          {subtitle ? <p className="mt-2 text-xs text-white/80">{subtitle}</p> : null}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ children, onClick, title, variant = "light", disabled = false }) {
  const classes =
    variant === "dark"
      ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${classes}`}
    >
      {children}
    </button>
  );
}

export default function AdminShipping() {
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [returnsList, setReturnsList] = useState([]);

  const [ordersMeta, setOrdersMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("orders");

  const [selectedModal, setSelectedModal] = useState({
    open: false,
    kind: "order",
    title: "",
    data: null,
    showRaw: false,
  });

  const [shipmentForm, setShipmentForm] = useState({
    shipmentDbId: "",
    courierId: "",
  });

  const [serviceabilityForm, setServiceabilityForm] = useState({
    pincode: process.env.REACT_APP_WAREHOUSE_PINCODE || "",
    weight: 0.5,
    cod: false,
    length: 10,
    breadth: 10,
    height: 5,
    declared_value: 500,
    mode: "Surface",
  });

  const [estimateResult, setEstimateResult] = useState(null);
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [shipmentLookupResult, setShipmentLookupResult] = useState(null);
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);
  const [shipmentActionLoading, setShipmentActionLoading] = useState(false);

  const activeCouriers = useMemo(
    () => couriers.filter((courier) => courier?.isActive !== false),
    [couriers]
  );

  const defaultCourierId = activeCouriers[0]?.id ? String(activeCouriers[0].id) : "";

  const stats = useMemo(() => {
    const total = orders.length;
    const shipped = orders.filter((o) => String(o.status).toUpperCase() === "SHIPPED").length;
    const delivered = orders.filter((o) => String(o.status).toUpperCase() === "DELIVERED").length;
    const pending = orders.filter(
      (o) => !["SHIPPED", "DELIVERED", "CANCELED", "CANCELLED"].includes(String(o.status).toUpperCase())
    ).length;

    return {
      total,
      shipped,
      delivered,
      pending,
      couriersCount: couriers.filter((c) => c?.isActive !== false).length,
      returnsCount: returnsList.length,
    };
  }, [orders, couriers, returnsList]);

  const statusOptions = useMemo(() => {
    const known = [
      "NEW",
      "CONFIRMED",
      "PACKED",
      "PICKUP GENERATED",
      "SHIPPED",
      "OUT FOR DELIVERY",
      "DELIVERED",
      "CANCELED",
      "RETURN PENDING",
      "RTO INITIATED",
      "RTO DELIVERED",
      "RETURNED",
      "NDR",
    ];
    const fromOrders = orders.map((o) => String(o.status || "").toUpperCase()).filter(Boolean);
    return ["All", ...Array.from(new Set([...known, ...fromOrders]))];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = orders.filter((item) => {
      const matchesSearch =
        item.channelOrderId.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerPhone.toLowerCase().includes(q) ||
        item.awbCode.toLowerCase().includes(q) ||
        item.courierName.toLowerCase().includes(q) ||
        item.shiprocketOrderId.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" ||
        String(item.status).toUpperCase() === String(statusFilter).toUpperCase();

      return matchesSearch && matchesStatus;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "customer") return String(a.customerName).localeCompare(String(b.customerName));
      return String(a.channelOrderId).localeCompare(String(b.channelOrderId));
    });
  }, [orders, search, statusFilter, sortBy]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [ordersRes, couriersRes, returnsRes] = await Promise.allSettled([
        api.get("/orders", { params: { page: 1, per_page: 50 } }),
        api.get("/couriers/list"),
        api.get("/returns"),
      ]);

      if (ordersRes.status === "fulfilled") {
        const ordersBody = ordersRes.value.data?.data ?? ordersRes.value.data;
        const orderList = safeArray(ordersBody?.data ?? ordersBody);
        setOrders(orderList.map(normalizeShiprocketOrder));
        setOrdersMeta(ordersBody?.meta?.pagination || ordersBody?.pagination || null);
      } else {
        setOrders([]);
      }

      if (couriersRes.status === "fulfilled") {
        const couriersBody = couriersRes.value.data?.data ?? couriersRes.value.data;
        setCouriers(safeArray(couriersBody?.data ?? couriersBody));
      } else {
        setCouriers([]);
      }

      if (returnsRes.status === "fulfilled") {
        const returnsBody = returnsRes.value.data?.data ?? returnsRes.value.data;
        const returnRows = safeArray(returnsBody?.data ?? returnsBody);
        setReturnsList(returnRows.map(normalizeReturnOrder));
      } else {
        setReturnsList([]);
      }

      setLastSyncedAt(new Date());
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const showToast = (message, duration = 2500) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), duration);
  };

  const openModal = (kind, title, data) => {
    setSelectedModal({
      open: true,
      kind,
      title,
      data,
      showRaw: false,
    });
  };

  const closeModal = () => {
    setSelectedModal({
      open: false,
      kind: "order",
      title: "",
      data: null,
      showRaw: false,
    });
  };

  const getLinkedShipmentDbId = (row) =>
    pickFirst(row?.shipmentDbId, row?.localShipmentId, row?.shipment_uuid, row?.shipment_id, row?.shipmentId, "");

  const runAssignAwb = async (shipmentDbId, courierId) => {
    if (!shipmentDbId) {
      setError("Shipment DB ID is required");
      return;
    }
    if (!courierId) {
      setError("Courier ID is required");
      return;
    }

    setShipmentActionLoading(true);
    try {
      const res = await api.post("/assign-awb", {
        shipmentDbId,
        courierId: Number(courierId),
      });

      const payload = res.data?.data || res.data;
      setShipmentLookupResult(payload);
      showToast("AWB assigned");
      setViewMode("shipment");
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const runRequestPickup = async (shipmentDbId) => {
    if (!shipmentDbId) {
      setError("Shipment DB ID is required");
      return;
    }

    setShipmentActionLoading(true);
    try {
      const res = await api.post("/pickup", { shipmentDbId });
      const payload = res.data?.data || res.data;
      setShipmentLookupResult(payload);
      showToast("Pickup requested");
      setViewMode("shipment");
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const openOrderDetail = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${row.shiprocketOrderId}`);
      const payload = res.data?.data || res.data;
      openModal("order", `Shiprocket Order · ${row.channelOrderId}`, payload);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const openTrackingDetail = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/track/${row.shiprocketOrderId}`);
      const payload = res.data?.data || res.data;
      openModal("tracking", `Tracking · ${row.channelOrderId}`, payload);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const openOrderInvoice = (row) => {
    window.open(
      `${api.defaults.baseURL}/invoice/order/${row.shiprocketOrderId}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const cancelOrder = async (row) => {
    if (!window.confirm(`Cancel order ${row.channelOrderId}?`)) return;
    try {
      setLoading(true);
      await api.post("/cancel", { shiprocketOrderId: row.shiprocketOrderId });
      showToast(`Cancelled ${row.channelOrderId}`);
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadShipmentByDbId = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }

    try {
      setShipmentActionLoading(true);
      const res = await api.get(`/shipment/${shipmentForm.shipmentDbId.trim()}`);
      const payload = res.data?.data || res.data;
      setShipmentLookupResult(payload);
      openModal("shipment", `Shipment · ${shipmentForm.shipmentDbId.trim()}`, payload);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const syncShipment = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }

    try {
      setShipmentActionLoading(true);
      const res = await api.post(`/shipment/${shipmentForm.shipmentDbId.trim()}/sync`);
      const payload = res.data?.data || res.data;
      setShipmentLookupResult(payload);
      showToast("Shipment tracking synced");
      openModal("shipment", `Synced Shipment · ${shipmentForm.shipmentDbId.trim()}`, payload);
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const handleOrderAssignAwb = (row) => {
    const linkedShipmentId = getLinkedShipmentDbId(row);

    if (linkedShipmentId) {
      const courierId = defaultCourierId || shipmentForm.courierId;
      setShipmentForm({
        shipmentDbId: linkedShipmentId,
        courierId,
      });
      setViewMode("shipment");
      runAssignAwb(linkedShipmentId, courierId);
      return;
    }

    setShipmentForm((prev) => ({
      ...prev,
      shipmentDbId: "",
      courierId: prev.courierId || defaultCourierId,
    }));
    setViewMode("shipment");
    setShipmentLookupResult(null);
    showToast("Load the shipment first, then assign AWB.");
  };

  const handleOrderRequestPickup = (row) => {
    const linkedShipmentId = getLinkedShipmentDbId(row);

    if (linkedShipmentId) {
      setShipmentForm({
        shipmentDbId: linkedShipmentId,
        courierId: defaultCourierId,
      });
      setViewMode("shipment");
      runRequestPickup(linkedShipmentId);
      return;
    }

    setShipmentForm((prev) => ({
      ...prev,
      shipmentDbId: "",
      courierId: prev.courierId || defaultCourierId,
    }));
    setViewMode("shipment");
    setShipmentLookupResult(null);
    showToast("Load the shipment first, then request pickup.");
  };

  const runServiceabilityEstimate = async () => {
    if (!serviceabilityForm.pincode.trim()) {
      setError("Pincode is required");
      return;
    }

    try {
      setServiceabilityLoading(true);
      const res = await api.get(`/estimate/${serviceabilityForm.pincode.trim()}`, {
        params: {
          weight: serviceabilityForm.weight,
          cod: serviceabilityForm.cod ? 1 : 0,
          length: serviceabilityForm.length,
          breadth: serviceabilityForm.breadth,
          height: serviceabilityForm.height,
          declared_value: serviceabilityForm.declared_value,
          mode: serviceabilityForm.mode,
        },
      });
      setEstimateResult(res.data);
      showToast("Estimate fetched");
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setServiceabilityLoading(false);
    }
  };

  const runServiceabilityCheck = async () => {
    if (!serviceabilityForm.pincode.trim()) {
      setError("Pincode is required");
      return;
    }

    try {
      setServiceabilityLoading(true);
      const res = await api.post("/serviceability", {
        pincode: serviceabilityForm.pincode.trim(),
        weight: serviceabilityForm.weight,
        cod: serviceabilityForm.cod,
        length: serviceabilityForm.length,
        breadth: serviceabilityForm.breadth,
        height: serviceabilityForm.height,
        declared_value: serviceabilityForm.declared_value,
        mode: serviceabilityForm.mode,
      });
      setServiceabilityResult(res.data);
      showToast("Serviceability stored");
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setServiceabilityLoading(false);
    }
  };

  const refreshCouriers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/couriers/list");
      const body = res.data?.data || res.data;
      setCouriers(safeArray(body));
      showToast("Couriers refreshed");
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const assignAwbFromShipmentPanel = async () => {
    const id = shipmentForm.shipmentDbId.trim();
    const courierId = shipmentForm.courierId || defaultCourierId;
    if (!id) return setError("Shipment DB ID is required");
    await runAssignAwb(id, courierId);
  };

  const requestPickupFromShipmentPanel = async () => {
    const id = shipmentForm.shipmentDbId.trim();
    if (!id) return setError("Shipment DB ID is required");
    await runRequestPickup(id);
  };

  const tabs = [
    { key: "orders", label: "Orders", icon: ShoppingBag },
    { key: "shipment", label: "Shipment Lookup", icon: Package },
    { key: "serviceability", label: "Serviceability", icon: Route },
    { key: "couriers", label: "Couriers", icon: Truck },
    { key: "returns", label: "Returns", icon: Undo2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white sm:p-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_20px_80px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-6"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                <LayoutDashboard size={14} />
                Shipping Control
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Shipping</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  AWB, couriers, serviceability, pickup requests, and live Shiprocket orders.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={refreshAll}
                disabled={refreshing || loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => setViewMode("shipment")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Package size={16} />
                Shipment Panel
              </button>
            </div>
          </div>

          <AnimatePresence>
            {notice ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <BadgeCheck size={16} />
                {notice}
                <button
                  onClick={() => setNotice("")}
                  className="ml-2 rounded-md p-1 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/20"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          ) : null}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total Orders" value={stats.total} subtitle={ordersMeta?.total ? `Shiprocket total: ${ordersMeta.total}` : "Live from Shiprocket"} icon={ShoppingBag} gradient="from-violet-500 to-purple-600" />
          <StatCard title="Shipped" value={stats.shipped} subtitle="Orders in transit" icon={Truck} gradient="from-sky-500 to-cyan-600" />
          <StatCard title="Delivered" value={stats.delivered} subtitle="Completed orders" icon={PackageCheck} gradient="from-emerald-500 to-green-600" />
          <StatCard title="Pending" value={stats.pending} subtitle="New / processing / others" icon={Clock3} gradient="from-amber-500 to-orange-600" />
          <StatCard title="Couriers" value={stats.couriersCount} subtitle="Active DB couriers" icon={Route} gradient="from-fuchsia-500 to-pink-600" />
        </div>

        <div className="flex flex-wrap gap-2 rounded-3xl border border-white/70 bg-white p-3 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {viewMode === "orders" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <SectionShell title="Shiprocket Orders" description="Essential order information first. Raw response is one click away.">
                <div className="mt-0" />
              </SectionShell>

              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order, customer, phone, AWB..."
                    className="w-full min-w-[280px] rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <ArrowUpDown
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    <option value="latest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="customer">Customer A–Z</option>
                    <option value="order">Order No.</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <ShippingTable
                shipments={filteredOrders}
                onView={openOrderDetail}
                onTrack={openTrackingDetail}
                onAssignAwb={handleOrderAssignAwb}
                onRequestPickup={handleOrderRequestPickup}
                onInvoice={openOrderInvoice}
                onCancel={cancelOrder}
              />
            </div>
          </motion.div>
        ) : null}

        {viewMode === "shipment" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
              <SectionShell
                title="Shipment Lookup"
                description="Use your internal shipment DB ID to assign AWB, request pickup, sync tracking, open invoice, or cancel."
              >
                <div className="mt-0 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Shipment DB ID
                    </label>
                    <input
                      value={shipmentForm.shipmentDbId}
                      onChange={(e) =>
                        setShipmentForm((prev) => ({
                          ...prev,
                          shipmentDbId: e.target.value,
                        }))
                      }
                      placeholder="shipment uuid"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Courier ID for AWB
                    </label>
                    <select
                      value={shipmentForm.courierId}
                      onChange={(e) =>
                        setShipmentForm((prev) => ({
                          ...prev,
                          courierId: e.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                    >
                      <option value="">Select courier</option>
                      {activeCouriers.map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.id} • {courier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton onClick={loadShipmentByDbId} title="Load shipment" disabled={shipmentActionLoading}>
                    {shipmentActionLoading ? <Loader2 className="animate-spin" size={16} /> : <Package size={16} />}
                    Load Shipment
                  </ActionButton>
                  <ActionButton onClick={syncShipment} title="Sync tracking" disabled={shipmentActionLoading}>
                    <RefreshCw size={16} />
                    Sync Tracking
                  </ActionButton>
                  <ActionButton onClick={assignAwbFromShipmentPanel} title="Assign AWB" disabled={shipmentActionLoading}>
                    <PackageCheck size={16} />
                    Assign AWB
                  </ActionButton>
                  <ActionButton onClick={requestPickupFromShipmentPanel} title="Request pickup" disabled={shipmentActionLoading}>
                    <ShieldCheck size={16} />
                    Request Pickup
                  </ActionButton>
                </div>
              </SectionShell>

              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Latest shipment result
                </p>
                <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {JSON.stringify(shipmentLookupResult || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-4">
              <SectionShell title="Shipment Actions" description="Quick backend wiring for shipment routes.">
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-sm font-semibold">Required before AWB</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Load a shipment and select a courier ID.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-sm font-semibold">Recommended flow</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Sync tracking → assign AWB → request pickup → invoice or cancel.
                    </p>
                  </div>
                </div>
              </SectionShell>

              <SectionShell title="Courier Master Data" description="Loaded from /couriers/list">
                <div className="max-h-[300px] space-y-3 overflow-auto">
                  {activeCouriers.length ? (
                    activeCouriers.map((courier) => (
                      <div
                        key={courier.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {courier.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              ID: {courier.id}
                            </p>
                          </div>
                          <Badge tone={courier.isActive === false ? "rose" : "emerald"}>
                            {courier.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No couriers found.</p>
                  )}
                </div>
              </SectionShell>
            </div>
          </motion.div>
        ) : null}

        {viewMode === "serviceability" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1fr_1fr]"
          >
            <SectionShell
              title="Serviceability"
              description="Check and store courier serviceability using your pickup pincode and destination pincode."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Pincode
                  </label>
                  <input
                    value={serviceabilityForm.pincode}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    placeholder="533450"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Mode
                  </label>
                  <select
                    value={serviceabilityForm.mode}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({ ...prev, mode: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    <option value="Surface">Surface</option>
                    <option value="Air">Air</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={serviceabilityForm.weight}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        weight: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Declared Value
                  </label>
                  <input
                    type="number"
                    value={serviceabilityForm.declared_value}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        declared_value: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Length
                  </label>
                  <input
                    type="number"
                    value={serviceabilityForm.length}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        length: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Breadth
                  </label>
                  <input
                    type="number"
                    value={serviceabilityForm.breadth}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        breadth: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Height
                  </label>
                  <input
                    type="number"
                    value={serviceabilityForm.height}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        height: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div className="flex items-center gap-3 pt-8">
                  <input
                    id="cod"
                    type="checkbox"
                    checked={serviceabilityForm.cod}
                    onChange={(e) =>
                      setServiceabilityForm((prev) => ({
                        ...prev,
                        cod: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="cod" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Cash on Delivery
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton onClick={runServiceabilityEstimate} title="Get estimate" disabled={serviceabilityLoading}>
                  {serviceabilityLoading ? <Loader2 className="animate-spin" size={16} /> : <Clock3 size={16} />}
                  Estimate
                </ActionButton>
                <ActionButton onClick={runServiceabilityCheck} title="Check and store" disabled={serviceabilityLoading}>
                  <BadgeCheck size={16} />
                  Check & Store
                </ActionButton>
              </div>
            </SectionShell>

            <div className="space-y-4">
              <SectionShell title="Estimate Result" description="Fastest courier, COD availability, and courier list">
                <pre className="max-h-[320px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                  {JSON.stringify(estimateResult || {}, null, 2)}
                </pre>
              </SectionShell>

              <SectionShell title="Serviceability Store Result" description="Result from /serviceability">
                <pre className="max-h-[320px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                  {JSON.stringify(serviceabilityResult || {}, null, 2)}
                </pre>
              </SectionShell>
            </div>
          </motion.div>
        ) : null}

        {viewMode === "couriers" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1fr_1fr]"
          >
            <SectionShell title="Active Couriers" description="Loaded from /couriers/list">
              <div className="mb-4 flex justify-end">
                <ActionButton onClick={refreshCouriers} title="Refresh couriers">
                  <RefreshCw size={16} />
                  Refresh
                </ActionButton>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {activeCouriers.length ? (
                  activeCouriers.map((courier) => (
                    <div
                      key={courier.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                            {courier.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Courier ID: {courier.id}
                          </p>
                        </div>
                        <Badge tone={courier.isActive === false ? "rose" : "emerald"}>
                          {courier.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between">
                          <span>Base Courier ID</span>
                          <span className="font-semibold">{courier.baseCourierId ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mode</span>
                          <span className="font-semibold">{courier.mode ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Service Type</span>
                          <span className="font-semibold">{courier.serviceType ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Realtime Tracking</span>
                          <span className="font-semibold">{courier.realtimeTracking ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>POD Available</span>
                          <span className="font-semibold">{courier.podAvailable ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Call Before Delivery</span>
                          <span className="font-semibold">{courier.callBeforeDelivery ?? "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active couriers found.</p>
                )}
              </div>
            </SectionShell>

            <SectionShell title="Courier Master / Serviceability" description="DB couriers are used by shipment actions.">
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>/api/shipping/couriers/list</div>
                <div>/api/shipping/couriers</div>
                <div>/api/shipping/estimate/:pincode</div>
                <div>/api/shipping/serviceability</div>
              </div>
            </SectionShell>
          </motion.div>
        ) : null}

        {viewMode === "returns" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"
          >
            <SectionShell
              title="Return Orders"
              description="GET /returns. The list is live and raw details can be viewed in the modal."
            >
              <div className="overflow-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[760px] border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50 text-left dark:bg-slate-950">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Order
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Shipment
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnsList.length ? (
                      returnsList.map((item) => (
                        <tr
                          key={`${item.orderId}-${item.shipmentId}`}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {item.orderId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {item.shipmentId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {item.status}
                          </td>
                          <td className="px-4 py-3">
                            <ActionButton
                              onClick={() => openModal("return", `Return Order · ${item.orderId}`, item.raw)}
                              title="View return"
                            >
                              <Package size={16} />
                              View
                            </ActionButton>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                          No return orders yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionShell>

            <SectionShell title="Route Reference" description="These routes are mounted at /api/shipping">
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div>POST /api/shipping/returns</div>
                <div>PUT /api/shipping/returns</div>
                <div>GET /api/shipping/returns</div>
                <div>POST /api/shipping/exchange</div>
              </div>
            </SectionShell>
          </motion.div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Clock3 size={14} />
            Last synced {formatDateTime(lastSyncedAt)}
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck size={14} />
            All admin actions are wired to /api/shipping
          </div>
        </div>
      </div>

      <ShipmentDetailsModal
        open={selectedModal.open}
        kind={selectedModal.kind}
        title={selectedModal.title}
        data={selectedModal.data}
        showRaw={selectedModal.showRaw}
        onToggleRaw={() =>
          setSelectedModal((prev) => ({
            ...prev,
            showRaw: !prev.showRaw,
          }))
        }
        onClose={closeModal}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(JSON.stringify(selectedModal.data ?? {}, null, 2));
            showToast("JSON copied");
          } catch {
            showToast("Copy failed");
          }
        }}
      />
    </div>
  );
}
