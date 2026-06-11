// src/modules/shipping/AdminShipping.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  LayoutDashboard,
  Loader2,
  MapPinned,
  Package,
  PackageCheck,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Undo2,
  Upload,
  X,
} from "lucide-react";

const api = axios.create({
  baseURL: "/api/shipping",
});

const EMPTY_JSON = `{
}`;

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function readApiError(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Request failed"
  );
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeShiprocketOrder(order) {
  const shipment = Array.isArray(order?.shipments) ? order.shipments[0] : null;

  return {
    shiprocketOrderId: String(order?.id ?? ""),
    channelOrderId: order?.channel_order_id || String(order?.id ?? ""),
    customerName: order?.customer_name || "-",
    customerEmail: order?.customer_email || "-",
    customerPhone: order?.customer_phone || "-",
    pickupLocation: order?.pickup_location || "-",
    paymentMethod: order?.payment_method || "-",
    status: order?.status || "UNKNOWN",
    statusCode: order?.status_code ?? "-",
    total: order?.total ?? "-",
    tax: order?.tax ?? "-",
    shippingMethod: order?.shipping_method || "-",
    createdAt: order?.created_at || order?.channel_created_at || "-",
    shipmentId: shipment?.id ? String(shipment.id) : "",
    courierName: shipment?.courier || "-",
    awbCode: shipment?.awb || "-",
    returnAwb: shipment?.return_awb || "-",
    pickupTokenNumber: shipment?.pickup_token_number || "-",
    etd: shipment?.etd || "-",
    shiprocketShipmentRaw: shipment || null,
    products: Array.isArray(order?.products) ? order.products : [],
    shipments: Array.isArray(order?.shipments) ? order.shipments : [],
    activities: Array.isArray(order?.activities) ? order.activities : [],
    raw: order,
  };
}

function normalizeReturnOrder(item) {
  return {
    orderId: item?.order_id || item?.id || item?.return_order_id || "-",
    shipmentId: item?.shipment_id || "-",
    status: item?.status || item?.return_status || item?.state || "-",
    companyName: item?.company_name || "-",
    raw: item,
  };
}

function buildReturnCreateTemplate(order) {
  const selected = order?.raw || {};
  const product = selected?.products?.[0] || {};

  return JSON.stringify(
    {
      order_id: selected?.channel_order_id || String(selected?.id || ""),
      order_date: (selected?.channel_created_at || new Date().toISOString())
        .split(",")[0]
        .trim(),
      channel_id: selected?.channel_id || "",
      pickup_customer_name: selected?.customer_name || "",
      pickup_last_name: "",
      pickup_address: selected?.pickup_location || "",
      pickup_address_2: "",
      pickup_city: "Delhi",
      pickup_state: "Delhi",
      pickup_country: "India",
      pickup_pincode: Number(process.env.REACT_APP_DEFAULT_PICKUP_PINCODE || 110001),
      pickup_email: selected?.customer_email || "",
      pickup_phone: selected?.customer_phone || "",
      pickup_isd_code: "91",
      shipping_customer_name: "Dripzoid",
      shipping_last_name: "",
      shipping_address: "Return Warehouse",
      shipping_address_2: "",
      shipping_city: "Hyderabad",
      shipping_country: "India",
      shipping_pincode: Number(process.env.REACT_APP_DEFAULT_RETURN_PINCODE || 500001),
      shipping_state: "Telangana",
      shipping_email: "",
      shipping_isd_code: "91",
      shipping_phone: "9999999999",
      order_items: [
        {
          name: product?.name || "Product",
          sku: product?.channel_sku || "SKU",
          units: Number(product?.quantity || 1),
          selling_price: Number(selected?.total || 0) || 0,
          discount: 0,
          hsn: product?.hsn || "",
        },
      ],
      payment_method: "PREPAID",
      total_discount: "0",
      sub_total: Number(selected?.total || 0) || 0,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
      return_reason: "29",
    },
    null,
    2
  );
}

function buildReturnUpdateTemplate(returnRow) {
  const item = returnRow?.raw || {};
  return JSON.stringify(
    {
      order_id: String(item?.order_id || item?.id || ""),
      action: ["product_details"],
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
      return_warehouse_id: Number(process.env.REACT_APP_DEFAULT_RETURN_WAREHOUSE_ID || 0),
    },
    null,
    2
  );
}

function buildExchangeTemplate(order) {
  const selected = order?.raw || {};
  const product = selected?.products?.[0] || {};

  return JSON.stringify(
    {
      exchange_order_id: `EX_${selected?.channel_order_id || selected?.id || "ORDER"}`,
      seller_pickup_location_id: String(process.env.REACT_APP_DEFAULT_PICKUP_LOCATION_ID || ""),
      seller_shipping_location_id: String(process.env.REACT_APP_DEFAULT_PICKUP_LOCATION_ID || ""),
      return_order_id: `R_${selected?.channel_order_id || selected?.id || "ORDER"}`,
      order_date: new Date().toISOString().slice(0, 10),
      payment_method: "prepaid",
      buyer_shipping_first_name: selected?.customer_name?.split(" ")[0] || "Customer",
      buyer_shipping_last_name: selected?.customer_name?.split(" ").slice(1).join(" ") || "",
      buyer_shipping_email: selected?.customer_email || "",
      buyer_shipping_address: selected?.pickup_location || "",
      buyer_shipping_address_2: "",
      buyer_shipping_city: "Hyderabad",
      buyer_shipping_state: "Telangana",
      buyer_shipping_country: "India",
      buyer_shipping_pincode: "500001",
      buyer_shipping_phone: selected?.customer_phone || "",
      buyer_pickup_first_name: "Dripzoid",
      buyer_pickup_last_name: "",
      buyer_pickup_email: "",
      buyer_pickup_address: "Return Warehouse",
      buyer_pickup_address_2: "",
      buyer_pickup_city: "Hyderabad",
      buyer_pickup_state: "Telangana",
      buyer_pickup_country: "India",
      buyer_pickup_pincode: "500001",
      buyer_pickup_phone: "9999999999",
      order_items: [
        {
          name: product?.name || "Product",
          selling_price: Number(selected?.total || 0) || 0,
          units: 1,
          hsn: product?.hsn || "",
          sku: product?.channel_sku || "SKU",
          tax: "",
          discount: "",
          exchange_item_id: "",
          exchange_item_name: product?.name || "Product",
          exchange_item_sku: product?.channel_sku || "SKU",
        },
      ],
      sub_total: Number(selected?.total || 0) || 0,
      shipping_charges: "",
      giftwrap_charges: "",
      total_discount: "0",
      transaction_charges: "",
      return_length: 10,
      return_breadth: 10,
      return_height: 10,
      return_weight: 0.5,
      exchange_length: 10,
      exchange_breadth: 10,
      exchange_height: 10,
      exchange_weight: 0.5,
      return_reason: "29",
    },
    null,
    2
  );
}

function SectionTitle({ title, description, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <Icon size={13} />
          Dripzoid Shipping
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone] || tones.slate}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

function ModalShell({ open, title, onClose, children, widthClass = "max-w-3xl" }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={`fixed left-1/2 top-1/2 z-50 w-[min(96vw,1200px)] ${widthClass} max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_100px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[calc(90vh-65px)] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function JsonModal({ open, title, payload, onClose, onCopy }) {
  return (
    <ModalShell open={open} title={title} onClose={onClose} widthClass="max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">Raw backend response</p>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        >
          <Clipboard size={16} />
          Copy JSON
        </button>
      </div>
      <pre className="overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        {JSON.stringify(payload ?? {}, null, 2)}
      </pre>
    </ModalShell>
  );
}

function JsonEditorModal({ open, title, value, onClose, onSubmit, setValue, submitLabel = "Submit" }) {
  return (
    <ModalShell open={open} title={title} onClose={onClose} widthClass="max-w-5xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Edit the JSON payload and send it to your backend route.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-[420px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-white"
        />
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function AdminShipping() {
  const [orders, setOrders] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [returns, setReturns] = useState([]);

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

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [selectedTrackingDetails, setSelectedTrackingDetails] = useState(null);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState(null);

  const [copyPayload, setCopyPayload] = useState("");

  const [shipmentLookupId, setShipmentLookupId] = useState("");
  const [shipmentCourierId, setShipmentCourierId] = useState("");
  const [shipmentActionLoading, setShipmentActionLoading] = useState(false);

  const [serviceabilityForm, setServiceabilityForm] = useState({
    pincode: "",
    weight: 0.5,
    cod: false,
    length: 10,
    breadth: 10,
    height: 5,
    declared_value: 500,
    mode: "Surface",
  });
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [estimateResult, setEstimateResult] = useState(null);
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);

  const [payloadModal, setPayloadModal] = useState({
    open: false,
    kind: "",
    title: "",
    payload: EMPTY_JSON,
    submitLabel: "Submit",
  });

  const [jsonModal, setJsonModal] = useState({
    open: false,
    title: "",
    payload: null,
  });

  const stats = useMemo(() => {
    const total = orders.length;
    const shipped = orders.filter((o) => String(o.status).toUpperCase() === "SHIPPED").length;
    const delivered = orders.filter((o) => String(o.status).toUpperCase() === "DELIVERED").length;
    const cancelled = orders.filter((o) => String(o.status).toUpperCase() === "CANCELED" || String(o.status).toUpperCase() === "CANCELLED").length;
    const pending = orders.filter((o) => !["SHIPPED", "DELIVERED", "CANCELED", "CANCELLED"].includes(String(o.status).toUpperCase())).length;
    return { total, shipped, delivered, cancelled, pending };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = orders.filter((item) => {
      const matchesSearch =
        item.channelOrderId?.toLowerCase().includes(q) ||
        item.customerName?.toLowerCase().includes(q) ||
        item.customerPhone?.toLowerCase().includes(q) ||
        item.awbCode?.toLowerCase().includes(q) ||
        item.courierName?.toLowerCase().includes(q) ||
        item.shiprocketOrderId?.toLowerCase().includes(q);

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

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [ordersRes, couriersRes, returnsRes] = await Promise.allSettled([
        api.get("/orders", { params: { page: 1, per_page: 50 } }),
        api.get("/couriers/list"),
        api.get("/returns"),
      ]);

      if (ordersRes.status === "fulfilled") {
        const shiprocketResponse = ordersRes.value.data?.data || {};
        const list = safeArray(shiprocketResponse?.data || shiprocketResponse);
        setOrders(list.map(normalizeShiprocketOrder));
        setOrdersMeta(shiprocketResponse?.meta?.pagination || null);
      } else {
        setOrders([]);
      }

      if (couriersRes.status === "fulfilled") {
        setCouriers(safeArray(couriersRes.value.data?.data));
      } else {
        setCouriers([]);
      }

      if (returnsRes.status === "fulfilled") {
        const body = returnsRes.value.data?.data;
        setReturns(safeArray(body?.data || body).map(normalizeReturnOrder));
      } else {
        setReturns([]);
      }

      setLastSyncedAt(new Date());
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const showToast = (message, duration = 2500) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), duration);
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await loadDashboard();
    showToast("Dashboard refreshed");
  };

  const copyToClipboard = async (value) => {
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        return true;
      } catch {
        return false;
      }
    }
  };

  const openRawModal = (title, payload) => {
    setJsonModal({
      open: true,
      title,
      payload,
    });
    setCopyPayload(JSON.stringify(payload ?? {}, null, 2));
  };

  const viewShiprocketOrder = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${row.shiprocketOrderId}`);
      const payload = res.data?.data || res.data;
      openRawModal(`Shiprocket Order ${row.channelOrderId}`, payload);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const trackShiprocketOrder = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/track/${row.shiprocketOrderId}`);
      const payload = res.data?.data || res.data;
      setSelectedTrackingDetails(payload);
      openRawModal(`Tracking ${row.channelOrderId}`, payload);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const openInvoice = (row) => {
    window.open(`/api/shipping/invoice/order/${row.shiprocketOrderId}`, "_blank", "noopener,noreferrer");
  };

  const cancelShiprocketOrder = async (row) => {
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

  const openReturnCreate = (row) => {
    setPayloadModal({
      open: true,
      kind: "return-create",
      title: `Create Return Order · ${row.channelOrderId}`,
      payload: buildReturnCreateTemplate(row),
      submitLabel: "Create Return",
    });
  };

  const openReturnUpdate = (row) => {
    setPayloadModal({
      open: true,
      kind: "return-update",
      title: `Update Return Order · ${row.orderId}`,
      payload: buildReturnUpdateTemplate(row),
      submitLabel: "Update Return",
    });
  };

  const openExchangeCreate = (row) => {
    setPayloadModal({
      open: true,
      kind: "exchange-create",
      title: `Create Exchange Order · ${row.channelOrderId}`,
      payload: buildExchangeTemplate(row),
      submitLabel: "Create Exchange",
    });
  };

  const submitPayloadModal = async () => {
    try {
      const payload = JSON.parse(payloadModal.payload);

      setLoading(true);

      if (payloadModal.kind === "return-create") {
        await api.post("/returns", payload);
        showToast("Return order created");
      } else if (payloadModal.kind === "return-update") {
        await api.put("/returns", payload);
        showToast("Return order updated");
      } else if (payloadModal.kind === "exchange-create") {
        await api.post("/exchange", payload);
        showToast("Exchange order created");
      }

      setPayloadModal({
        open: false,
        kind: "",
        title: "",
        payload: EMPTY_JSON,
        submitLabel: "Submit",
      });

      await loadDashboard();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON payload");
      } else {
        setError(readApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const runServiceabilityEstimate = async () => {
    try {
      setServiceabilityLoading(true);
      const pin = serviceabilityForm.pincode.trim();
      if (!pin) {
        setError("Pincode is required");
        return;
      }
      const res = await api.get(`/estimate/${pin}`, {
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

  const runServiceabilityStore = async () => {
    try {
      setServiceabilityLoading(true);
      const res = await api.post("/serviceability", {
        pincode: serviceabilityForm.pincode,
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

  const loadShipmentByDbId = async () => {
    try {
      if (!shipmentLookupId.trim()) {
        setError("Shipment DB ID is required");
        return;
      }
      setShipmentActionLoading(true);
      const res = await api.get(`/shipment/${shipmentLookupId.trim()}`);
      const shipment = res.data?.data || res.data;
      setSelectedShipmentDetails(shipment);
      openRawModal(`Shipment ${shipmentLookupId.trim()}`, shipment);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const syncShipment = async () => {
    try {
      if (!shipmentLookupId.trim()) {
        setError("Shipment DB ID is required");
        return;
      }
      setShipmentActionLoading(true);
      const res = await api.post(`/shipment/${shipmentLookupId.trim()}/sync`);
      const payload = res.data?.data || res.data;
      showToast("Shipment tracking synced");
      setSelectedShipmentDetails(payload);
      openRawModal(`Synced Shipment ${shipmentLookupId.trim()}`, payload);
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const assignAwb = async () => {
    try {
      if (!shipmentLookupId.trim()) {
        setError("Shipment DB ID is required");
        return;
      }
      if (!shipmentCourierId) {
        setError("Courier ID is required");
        return;
      }
      setShipmentActionLoading(true);
      const res = await api.post("/assign-awb", {
        shipmentDbId: shipmentLookupId.trim(),
        courierId: Number(shipmentCourierId),
      });
      const payload = res.data?.data || res.data;
      showToast("AWB assigned");
      setSelectedShipmentDetails(payload);
      openRawModal(`AWB Assigned · ${shipmentLookupId.trim()}`, payload);
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const requestPickup = async () => {
    try {
      if (!shipmentLookupId.trim()) {
        setError("Shipment DB ID is required");
        return;
      }
      setShipmentActionLoading(true);
      const res = await api.post("/pickup", {
        shipmentDbId: shipmentLookupId.trim(),
      });
      const payload = res.data?.data || res.data;
      showToast("Pickup requested");
      setSelectedShipmentDetails(payload);
      openRawModal(`Pickup Requested · ${shipmentLookupId.trim()}`, payload);
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const downloadInvoice = async () => {
    if (!shipmentLookupId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }
    window.open(`/api/shipping/invoice/shipment/${shipmentLookupId.trim()}`, "_blank", "noopener,noreferrer");
  };

  const cancelShipment = async () => {
    try {
      if (!shipmentLookupId.trim()) {
        setError("Shipment DB ID is required");
        return;
      }
      if (!window.confirm(`Cancel shipment ${shipmentLookupId.trim()}?`)) return;

      setShipmentActionLoading(true);
      const res = await api.post("/cancel", {
        shipmentDbId: shipmentLookupId.trim(),
      });
      const payload = res.data?.data || res.data;
      showToast("Shipment cancelled");
      setSelectedShipmentDetails(payload);
      openRawModal(`Cancelled Shipment · ${shipmentLookupId.trim()}`, payload);
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const refreshCouriers = async () => {
    try {
      const res = await api.get("/couriers/list");
      setCouriers(safeArray(res.data?.data));
      showToast("Couriers refreshed");
    } catch (err) {
      setError(readApiError(err));
    }
  };

  const activeCouriers = couriers.filter((courier) => courier?.isActive !== false);

  const tabs = [
    { key: "orders", label: "Orders", icon: ShoppingBag },
    { key: "shipment", label: "Shipment Lookup", icon: Package },
    { key: "serviceability", label: "Serviceability", icon: Route },
    { key: "couriers", label: "Couriers", icon: Truck },
    { key: "returns", label: "Returns & Exchange", icon: Undo2 },
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
            <SectionTitle
              title="Shipping Control"
              description="Live Shiprocket orders, shipments, tracking, couriers, returns, exchange, and shipment actions."
              icon={LayoutDashboard}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionButton onClick={refreshAll} title="Refresh dashboard" variant="dark" disabled={refreshing || loading}>
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setViewMode("serviceability");
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                }}
                title="Open serviceability"
              >
                <Route size={16} />
                Serviceability
              </ActionButton>
            </div>
          </div>

          <AnimatePresence>
            {notice ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <BadgeCheck size={16} />
                {notice}
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
          <StatCard title="Couriers" value={activeCouriers.length} subtitle="Active DB couriers" icon={Route} gradient="from-fuchsia-500 to-pink-600" />
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <SectionTitle
                title="Shiprocket Orders"
                description="This table is fully wired to GET /api/shipping/orders and the order detail / track / cancel / invoice routes."
                icon={ShoppingBag}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order, customer, phone, AWB..."
                    className="w-full min-w-[280px] rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div className="relative">
                  <Filter size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    {["All", "NEW", "SHIPPED", "OUT FOR DELIVERY", "DELIVERED", "CANCELED", "RETURN PENDING", "RETURNED"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <ArrowUpDown size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
              <table className="w-full min-w-[1200px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/95 text-left dark:bg-slate-950/90">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Courier</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">AWB</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          Loading orders...
                        </div>
                      </td>
                    </tr>
                  ) : filteredOrders.length ? (
                    filteredOrders.map((row) => (
                      <tr
                        key={row.shiprocketOrderId}
                        className="border-t border-slate-200/70 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-6 py-4 align-top">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {row.channelOrderId}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Shiprocket ID: {row.shiprocketOrderId}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">{row.customerName}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.customerPhone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <Badge tone={String(row.status).toUpperCase() === "DELIVERED" ? "emerald" : String(row.status).toUpperCase() === "SHIPPED" ? "sky" : String(row.status).toUpperCase().includes("RETURN") ? "amber" : String(row.status).toUpperCase().includes("CANCE") ? "rose" : "slate"}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                            <Truck size={15} className="text-sky-500" />
                            {row.courierName}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <code className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                            {row.awbCode || "Not generated"}
                          </code>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionButton onClick={() => viewShiprocketOrder(row)} title="View order">
                              <FileText size={16} />
                            </ActionButton>
                            <ActionButton onClick={() => trackShiprocketOrder(row)} title="Track order">
                              <Route size={16} />
                            </ActionButton>
                            <ActionButton onClick={() => openInvoice(row)} title="Invoice">
                              <ExternalLink size={16} />
                            </ActionButton>
                            <ActionButton onClick={() => cancelShiprocketOrder(row)} title="Cancel">
                              <X size={16} />
                            </ActionButton>
                            <ActionButton onClick={() => openReturnCreate(row)} title="Create return">
                              <Undo2 size={16} />
                            </ActionButton>
                            <ActionButton onClick={() => openExchangeCreate(row)} title="Create exchange">
                              <Upload size={16} />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                          No orders found. Try a different search or refresh the dashboard.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}

        {viewMode === "shipment" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
              <SectionTitle
                title="Shipment Lookup"
                description="Use your internal shipment DB ID to wire AWB, pickup, sync tracking, invoice, cancel, and shipment detail actions."
                icon={Package}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Shipment DB ID
                  </label>
                  <input
                    value={shipmentLookupId}
                    onChange={(e) => setShipmentLookupId(e.target.value)}
                    placeholder="shipment uuid"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Courier ID for AWB
                  </label>
                  <select
                    value={shipmentCourierId}
                    onChange={(e) => setShipmentCourierId(e.target.value)}
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
                  {shipmentActionLoading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                  Load
                </ActionButton>
                <ActionButton onClick={syncShipment} title="Sync tracking" disabled={shipmentActionLoading}>
                  <RefreshCw size={16} />
                  Sync
                </ActionButton>
                <ActionButton onClick={assignAwb} title="Assign AWB" disabled={shipmentActionLoading}>
                  <PackageCheck size={16} />
                  Assign AWB
                </ActionButton>
                <ActionButton onClick={requestPickup} title="Request pickup" disabled={shipmentActionLoading}>
                  <ShieldCheck size={16} />
                  Pickup
                </ActionButton>
                <ActionButton onClick={downloadInvoice} title="Download invoice" disabled={shipmentActionLoading}>
                  <ExternalLink size={16} />
                  Invoice
                </ActionButton>
                <ActionButton onClick={cancelShipment} title="Cancel shipment" disabled={shipmentActionLoading}>
                  <X size={16} />
                  Cancel
                </ActionButton>
              </div>

              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Latest shipment result</p>
                <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  {JSON.stringify(selectedShipmentDetails || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
                <SectionTitle
                  title="Shipment Actions"
                  description="One-click backend wiring for the shipment routes."
                  icon={BadgeCheck}
                />
                <div className="mt-4 grid gap-3">
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
              </div>

              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
                <SectionTitle
                  title="Courier Master Data"
                  description="The shipment lookup uses the active couriers table from /couriers/list."
                  icon={Truck}
                />
                <div className="mt-4 max-h-[300px] overflow-auto space-y-3">
                  {activeCouriers.map((courier) => (
                    <div key={courier.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950 dark:text-white">
                            {courier.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: {courier.id}</p>
                        </div>
                        <Badge tone={courier.isActive === false ? "rose" : "emerald"}>
                          {courier.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {viewMode === "serviceability" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1fr_1fr]"
          >
            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
              <SectionTitle
                title="Serviceability"
                description="Uses /estimate/:pincode and /serviceability to check and store courier serviceability."
                icon={Route}
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Pincode</label>
                  <input
                    value={serviceabilityForm.pincode}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="600001"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Mode</label>
                  <select
                    value={serviceabilityForm.mode}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, mode: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  >
                    <option value="Surface">Surface</option>
                    <option value="Air">Air</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    value={serviceabilityForm.weight}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Declared Value</label>
                  <input
                    type="number"
                    value={serviceabilityForm.declared_value}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, declared_value: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Length</label>
                  <input
                    type="number"
                    value={serviceabilityForm.length}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, length: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Breadth</label>
                  <input
                    type="number"
                    value={serviceabilityForm.breadth}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, breadth: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Height</label>
                  <input
                    type="number"
                    value={serviceabilityForm.height}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, height: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                  />
                </div>

                <div className="flex items-center gap-3 pt-8">
                  <input
                    id="cod"
                    type="checkbox"
                    checked={serviceabilityForm.cod}
                    onChange={(e) => setServiceabilityForm((prev) => ({ ...prev, cod: e.target.checked }))}
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
                <ActionButton onClick={runServiceabilityStore} title="Check and store" disabled={serviceabilityLoading}>
                  <Upload size={16} />
                  Check & Store
                </ActionButton>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
                <SectionTitle
                  title="Estimate Result"
                  description="Fastest courier, COD availability, and courier list returned by Shiprocket."
                  icon={Clock3}
                />
                <pre className="mt-4 max-h-[320px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200 dark:bg-slate-950">
                  {JSON.stringify(estimateResult || {}, null, 2)}
                </pre>
              </div>

              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900">
                <SectionTitle
                  title="Serviceability Store Result"
                  description="Result from /serviceability (this also stores rows in ServiceabilityCheck)."
                  icon={BadgeCheck}
                />
                <pre className="mt-4 max-h-[320px] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200 dark:bg-slate-950">
                  {JSON.stringify(serviceabilityResult || {}, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        ) : null}

        {viewMode === "couriers" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 xl:grid-cols-[1fr_1fr]"
          >
            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle
                  title="Active Couriers"
                  description="Loaded from /couriers/list"
                  icon={Truck}
                />
                <ActionButton onClick={refreshCouriers} title="Refresh couriers">
                  <RefreshCw size={16} />
                  Refresh
                </ActionButton>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {activeCouriers.map((courier) => (
                  <div
                    key={courier.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{courier.name}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Courier ID: {courier.id}</p>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
              <SectionTitle
                title="Direct Couriers / Serviceability API"
                description="For admin debugging and courier comparison. This is the live Shiprocket courier response path."
                icon={Route}
              />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Use the Serviceability tab for a full workflow. This section is your active courier directory.
              </p>

              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Route mapping</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div>/api/shipping/couriers</div>
                  <div>/api/shipping/couriers/list</div>
                  <div>/api/shipping/estimate/:pincode</div>
                  <div>/api/shipping/serviceability</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {viewMode === "returns" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
                <SectionTitle
                  title="Return Orders"
                  description="GET /returns, POST /returns, PUT /returns"
                  icon={Undo2}
                />
                <div className="mt-5 overflow-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[760px] border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50 text-left dark:bg-slate-950">
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shipment</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.length ? (
                        returns.map((item) => (
                          <tr key={`${item.orderId}-${item.shipmentId}`} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{item.orderId}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{item.shipmentId}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{item.status}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <ActionButton onClick={() => openReturnUpdate(item)} title="Update return">
                                  <RefreshCw size={16} />
                                  Update
                                </ActionButton>
                                <ActionButton onClick={() => openRawModal(`Return Order · ${item.orderId}`, item.raw)} title="View return">
                                  <FileText size={16} />
                                  View
                                </ActionButton>
                              </div>
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
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
                  <SectionTitle
                    title="Create Return / Exchange"
                    description="Pick an order in the Orders tab, then generate the return/exchange JSON payload."
                    icon={Undo2}
                  />
                  <div className="mt-5 flex flex-wrap gap-2">
                    <ActionButton onClick={() => {
                      const row = filteredOrders[0];
                      if (!row) return setError("No order available to seed payload");
                      openReturnCreate(row);
                    }} title="Create return">
                      <Undo2 size={16} />
                      Create Return
                    </ActionButton>
                    <ActionButton onClick={() => {
                      const row = filteredOrders[0];
                      if (!row) return setError("No order available to seed payload");
                      openExchangeCreate(row);
                    }} title="Create exchange">
                      <Upload size={16} />
                      Create Exchange
                    </ActionButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
                  <SectionTitle
                    title="Route Reference"
                    description="These routes are already mounted at /api/shipping."
                    icon={BadgeCheck}
                  />
                  <div className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div>POST /api/shipping/returns</div>
                    <div>PUT /api/shipping/returns</div>
                    <div>GET /api/shipping/returns</div>
                    <div>POST /api/shipping/exchange</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Clock3 size={14} />
            Last synced {formatDateTime(lastSyncedAt)}
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck size={14} />
            All admin actions are now wired to /api/shipping
          </div>
        </div>
      </div>

      <JsonModal
        open={jsonModal.open}
        title={jsonModal.title}
        payload={jsonModal.payload}
        onClose={() => setJsonModal({ open: false, title: "", payload: null })}
        onCopy={async () => {
          const ok = await copyToClipboard(copyPayload || JSON.stringify(jsonModal.payload ?? {}, null, 2));
          if (ok) showToast("JSON copied");
        }}
      />

      <JsonEditorModal
        open={payloadModal.open}
        title={payloadModal.title}
        value={payloadModal.payload}
        setValue={(val) => setPayloadModal((prev) => ({ ...prev, payload: val }))}
        onClose={() =>
          setPayloadModal({
            open: false,
            kind: "",
            title: "",
            payload: EMPTY_JSON,
            submitLabel: "Submit",
          })
        }
        onSubmit={submitPayloadModal}
        submitLabel={payloadModal.submitLabel}
      />
    </div>
  );
}
