// src/modules/shipping/AdminShipping.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
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
  baseURL: import.meta.env.VITE_SHIPPING_API_BASE_URL || "/api/shipping",
});

const DEFAULT_PICKUP_LOCATION_ID = "5723898";
const DEFAULT_RETURN_WAREHOUSE_ID = "1072";
const DEFAULT_RETURN_PINCODE = "500001";
const DEFAULT_PICKUP_PINCODE = "110045";

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

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
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
    shipmentId: pickFirst(item?.shipment_id, "-",),
    status: item?.status || item?.return_status || item?.state || "-",
    companyName: item?.company_name || "-",
    createdAt: item?.created_at || item?.createdAt || "-",
  };
}

function normalizeTrackingEvent(evt) {
  return {
    status: pickFirst(evt?.status, evt?.current_status, evt?.shipment_status, "Update"),
    activity: pickFirst(evt?.activity, evt?.note, evt?.description, evt?.current_status, "Tracking update"),
    location: pickFirst(evt?.location, evt?.city, evt?.hub_name, evt?.scanned_location, null),
    scanTimestamp: pickFirst(evt?.scan_timestamp, evt?.scanTimestamp, evt?.date, evt?.created_at, null),
    raw: evt,
  };
}

function extractTrackingEvents(payload) {
  const candidates = [
    payload?.tracking_data?.shipment_track_activities,
    payload?.data?.tracking_data?.shipment_track_activities,
    payload?.tracking_data?.shipment_track,
    payload?.data?.tracking_data?.shipment_track,
    payload?.data?.track_data?.shipment_track_activities,
    payload?.track_data?.shipment_track_activities,
  ];

  const found = candidates.find((v) => Array.isArray(v));
  if (!found) return [];

  return found
    .flatMap((item) => {
      if (!item) return [];
      if (
        item.activity ||
        item.status ||
        item.location ||
        item.scan_timestamp ||
        item.date
      ) {
        return [normalizeTrackingEvent(item)];
      }
      if (Array.isArray(item?.activities)) {
        return item.activities.map(normalizeTrackingEvent);
      }
      return [];
    })
    .filter(Boolean);
}

function buildReturnCreateTemplate(order) {
  const selected = order?.raw || order || {};
  const product = selected?.products?.[0] || {};

  return JSON.stringify(
    {
      order_id: String(pickFirst(selected?.channel_order_id, selected?.id, "")),
      order_date: String(selected?.channel_created_at || new Date().toISOString()).split(",")[0].trim(),
      channel_id: String(selected?.channel_id || ""),
      pickup_customer_name: selected?.customer_name || "",
      pickup_last_name: "",
      pickup_address: selected?.pickup_location || "",
      pickup_address_2: "",
      pickup_city: "Delhi",
      pickup_state: "Delhi",
      pickup_country: "India",
      pickup_pincode: Number(DEFAULT_PICKUP_PINCODE),
      pickup_email: selected?.customer_email || "",
      pickup_phone: selected?.customer_phone || "",
      pickup_isd_code: "91",
      shipping_customer_name: "Dripzoid",
      shipping_last_name: "",
      shipping_address: "Return Warehouse",
      shipping_address_2: "",
      shipping_city: "Hyderabad",
      shipping_country: "India",
      shipping_pincode: Number(DEFAULT_RETURN_PINCODE),
      shipping_state: "Telangana",
      shipping_email: "",
      shipping_isd_code: "91",
      shipping_phone: "9999999999",
      order_items: [
        {
          name: product?.name || "Product",
          sku: product?.channel_sku || product?.sku || "SKU",
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
  const item = returnRow?.raw || returnRow || {};
  return JSON.stringify(
    {
      order_id: String(pickFirst(item?.order_id, item?.id, "")),
      action: ["product_details"],
      length: 11,
      breadth: 10,
      height: 10,
      return_warehouse_id: Number(DEFAULT_RETURN_WAREHOUSE_ID),
      weight: 1.5,
    },
    null,
    2
  );
}

function splitName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "Customer",
    last: parts.slice(1).join(" "),
  };
}

function buildExchangeTemplate(order) {
  const selected = order?.raw || order || {};
  const product = selected?.products?.[0] || {};
  const { first, last } = splitName(selected?.customer_name || "Customer");

  return JSON.stringify(
    {
      exchange_order_id: `EX_${selected?.channel_order_id || selected?.id || "ORDER"}`,
      seller_pickup_location_id: String(DEFAULT_PICKUP_LOCATION_ID),
      seller_shipping_location_id: String(DEFAULT_PICKUP_LOCATION_ID),
      return_order_id: `R_${selected?.channel_order_id || selected?.id || "ORDER"}`,
      order_date: new Date().toISOString().slice(0, 10),
      payment_method: "prepaid",
      buyer_shipping_first_name: first,
      buyer_shipping_last_name: last,
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
          sku: product?.channel_sku || product?.sku || "SKU",
          tax: "",
          discount: "",
          exchange_item_id: "",
          exchange_item_name: product?.name || "Product",
          exchange_item_sku: product?.channel_sku || product?.sku || "SKU",
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

function DetailCard({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-semibold text-slate-950 dark:text-white ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value ?? "-"}
      </p>
    </div>
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

function OrderInspectionView({ data }) {
  const order = data || {};
  const shipment = Array.isArray(order?.shipments) ? order.shipments[0] : null;
  const products = Array.isArray(order?.products) ? order.products : [];
  const activities = Array.isArray(order?.activities) ? order.activities : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Shiprocket Order ID" value={order?.id ?? order?.shiprocketOrderId} mono />
        <DetailCard label="Channel Order ID" value={order?.channel_order_id || order?.channelOrderId || "-"} mono />
        <DetailCard label="Status" value={order?.status || "-"} />
        <DetailCard label="Payment" value={order?.payment_method || order?.paymentMethod || "-"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Customer" description="Essential customer and order metadata">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Customer" value={order?.customer_name || "-"} />
            <DetailCard label="Email" value={order?.customer_email || "-"} />
            <DetailCard label="Phone" value={order?.customer_phone || "-"} />
            <DetailCard label="Pickup Location" value={order?.pickup_location || "-"} />
            <DetailCard label="Shipping Method" value={order?.shipping_method || "-"} />
            <DetailCard label="Created At" value={formatDateTime(order?.created_at || order?.channel_created_at)} />
          </div>
        </SectionShell>

        <SectionShell title="Shipment" description="Shipment snapshot inside Shiprocket order response">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Shipment ID" value={shipment?.id || "-"} mono />
            <DetailCard label="Courier" value={shipment?.courier || "-"} />
            <DetailCard label="AWB" value={shipment?.awb || "-"} mono />
            <DetailCard label="Return AWB" value={shipment?.return_awb || "-"} mono />
            <DetailCard label="Pickup Token" value={shipment?.pickup_token_number || "-"} mono />
            <DetailCard label="ETD" value={shipment?.etd || "-"} />
          </div>
        </SectionShell>
      </div>

      <SectionShell
        title="Products"
        description={`Items in this order (${products.length} total)`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-left dark:bg-slate-950">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">SKU</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Qty</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">HSN</th>
              </tr>
            </thead>
            <tbody>
              {products.length ? (
                products.map((product, index) => (
                  <tr
                    key={`${product?.id || index}-${product?.name || index}`}
                    className="border-t border-slate-200 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.channel_sku || product?.sku || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.quantity ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(product?.status)}>{product?.status || "-"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                      {product?.hsn || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No product rows returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionShell>

      <SectionShell
        title="Activities"
        description="Activity stream returned by Shiprocket"
      >
        <div className="flex flex-wrap gap-2">
          {activities.length ? (
            activities.map((item, index) => (
              <Badge key={`${item}-${index}`} tone="violet">
                {String(item)}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No activities available.</p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function ShipmentInspectionView({ data }) {
  const shipment = data || {};
  const order = shipment?.order || {};
  const trackingEvents = Array.isArray(shipment?.trackingEvents) ? shipment.trackingEvents : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Shipment DB ID" value={shipment?.id || "-"} mono />
        <DetailCard label="Order ID" value={shipment?.orderId || "-"} mono />
        <DetailCard label="AWB" value={shipment?.awbCode || "-"} mono />
        <DetailCard label="Courier" value={shipment?.courierName || "-"} />
        <DetailCard label="Shipment Status" value={shipment?.shipmentStatus || "-"} />
        <DetailCard label="Pickup Token" value={shipment?.pickupTokenNumber || "-"} mono />
        <DetailCard label="Assigned At" value={formatDateTime(shipment?.assignedAt)} />
        <DetailCard label="Pickup Scheduled" value={formatDateTime(shipment?.pickupScheduledAt)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Linked Order" description="Dripzoid order attached to this shipment">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Order Number" value={order?.orderNumber || "-"} mono />
            <DetailCard label="Order Status" value={order?.status || "-"} />
            <DetailCard label="User ID" value={order?.userId || "-"} mono />
            <DetailCard label="Total Amount" value={formatMoney(order?.totalAmount)} />
          </div>
        </SectionShell>

        <SectionShell title="Shipment Metadata" description="Carrier and return flags">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Shiprocket Order ID" value={shipment?.shiprocketOrderId || "-"} mono />
            <DetailCard label="Shiprocket Shipment ID" value={shipment?.shipmentId || "-"} mono />
            <DetailCard label="Is Return" value={shipment?.isReturn ? "Yes" : "No"} />
            <DetailCard label="Updated At" value={formatDateTime(shipment?.updatedAt)} />
          </div>
        </SectionShell>
      </div>

      <SectionShell title="Tracking Events" description={`Stored events in ShipmentTracking (${trackingEvents.length} total)`}>
        <div className="space-y-4">
          {trackingEvents.length ? (
            trackingEvents.map((evt, index) => (
              <div key={`${evt?.id || index}-${index}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-0.5 h-3 w-3 rounded-full bg-slate-900 dark:bg-white" />
                  {index !== trackingEvents.length - 1 ? (
                    <div className="mt-1 h-12 w-px bg-slate-200 dark:bg-slate-800" />
                  ) : null}
                </div>
                <div className="pb-1">
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {evt?.status || "Update"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {evt?.activity || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {evt?.location || "-"} {evt?.scanTimestamp ? `• ${formatDateTime(evt?.scanTimestamp)}` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No tracking events have been synced yet.
            </p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function TrackingInspectionView({ data }) {
  const events = extractTrackingEvents(data);
  const summary = data?.tracking_data || data?.data?.tracking_data || data?.track_data || data || {};

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="AWB" value={pickFirst(summary?.awb_code, summary?.awbCode, "-")} mono />
        <DetailCard label="Shipment ID" value={pickFirst(summary?.shipment_id, summary?.shipmentId, "-")} mono />
        <DetailCard label="Current Status" value={pickFirst(summary?.current_status, summary?.status, "-")} />
        <DetailCard label="Courier" value={pickFirst(summary?.courier_name, summary?.courierName, "-")} />
      </div>

      <SectionShell title="Timeline" description={`Parsed from Shiprocket response (${events.length} events)`}>
        <div className="space-y-4">
          {events.length ? (
            events.map((evt, index) => (
              <div key={`${evt?.status || index}-${index}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-0.5 h-3 w-3 rounded-full bg-slate-900 dark:bg-white" />
                  {index !== events.length - 1 ? (
                    <div className="mt-1 h-12 w-px bg-slate-200 dark:bg-slate-800" />
                  ) : null}
                </div>
                <div className="pb-1">
                  <p className="font-semibold text-slate-950 dark:text-white">{evt?.status || "Update"}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {evt?.activity || "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {evt?.location || "-"} {evt?.scanTimestamp ? `• ${formatDateTime(evt?.scanTimestamp)}` : ""}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No structured timeline events were found in the live response.
            </p>
          )}
        </div>
      </SectionShell>
    </div>
  );
}

function ReturnInspectionView({ data }) {
  const row = data || {};
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Order ID" value={row?.orderId || row?.order_id || "-"} mono />
        <DetailCard label="Shipment ID" value={row?.shipmentId || row?.shipment_id || "-"} mono />
        <DetailCard label="Status" value={row?.status || "-"} />
        <DetailCard label="Company" value={row?.companyName || row?.company_name || "-"} />
      </div>

      <SectionShell title="Return Snapshot" description="Essential fields returned by the backend">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(row || {}).slice(0, 8).map(([key, value]) => (
            <DetailCard key={key} label={key} value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")} mono />
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function SectionTitle({ title, description, icon: Icon }) {
  return (
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

function IconButton({ children, onClick, title, disabled = false, active = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

function ModalShell({ open, onClose, children, widthClass = "max-w-6xl" }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={`fixed left-1/2 top-1/2 z-[101] w-[min(96vw,1200px)] ${widthClass} max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_100px_-30px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900`}
          >
            {children}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function InspectionModal({
  open,
  kind,
  title,
  data,
  showRaw,
  onToggleRaw,
  onClose,
  onCopy,
}) {
  const body =
    showRaw ? (
      <pre className="overflow-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    ) : kind === "shipment" ? (
      <ShipmentInspectionView data={data} />
    ) : kind === "tracking" ? (
      <TrackingInspectionView data={data} />
    ) : kind === "return" ? (
      <ReturnInspectionView data={data} />
    ) : (
      <OrderInspectionView data={data} />
    );

  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-6xl">
      <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                <BadgeCheck size={13} />
                {kind === "order"
                  ? "Order View"
                  : kind === "shipment"
                    ? "Shipment View"
                    : kind === "tracking"
                      ? "Tracking View"
                      : kind === "return"
                        ? "Return View"
                        : "Details"}
              </div>
              <h3 className="mt-3 truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Essential information first. Raw JSON is available on demand.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                onClick={onToggleRaw}
                title="Toggle raw response"
              >
                <FileText size={16} />
                {showRaw ? "Show Essential Info" : "Show Raw Response"}
              </ActionButton>

              <ActionButton
                onClick={onCopy}
                title="Copy JSON"
              >
                <Copy size={16} />
                Copy JSON
              </ActionButton>

              <IconButton
                onClick={onClose}
                title="Close"
              >
                <X size={16} />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{body}</div>
      </div>
    </ModalShell>
  );
}

function JsonEditorModal({
  open,
  title,
  value,
  onClose,
  onSubmit,
  setValue,
  submitLabel = "Submit",
}) {
  return (
    <ModalShell open={open} onClose={onClose} widthClass="max-w-5xl">
      <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                <Upload size={13} />
                Payload Editor
              </div>
              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                {title}
              </h3>
            </div>

            <IconButton onClick={onClose} title="Close">
              <X size={16} />
            </IconButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[460px] w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800 outline-none focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-white"
          />

          <div className="mt-4 flex items-center justify-end gap-3">
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
      </div>
    </ModalShell>
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

  const [inspection, setInspection] = useState({
    open: false,
    kind: "order",
    title: "",
    data: null,
    showRaw: false,
  });

  const [payloadModal, setPayloadModal] = useState({
    open: false,
    kind: "",
    title: "",
    payload: "",
    submitLabel: "Submit",
  });

  const [shipmentForm, setShipmentForm] = useState({
    shipmentDbId: "",
    courierId: "",
  });

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

  const [estimateResult, setEstimateResult] = useState(null);
  const [serviceabilityResult, setServiceabilityResult] = useState(null);
  const [shipmentLookupResult, setShipmentLookupResult] = useState(null);
  const [serviceabilityLoading, setServiceabilityLoading] = useState(false);
  const [shipmentActionLoading, setShipmentActionLoading] = useState(false);

  const statCards = useMemo(() => {
    const total = orders.length;
    const shipped = orders.filter((o) => String(o.status).toUpperCase() === "SHIPPED").length;
    const delivered = orders.filter((o) => String(o.status).toUpperCase() === "DELIVERED").length;
    const pending = orders.filter((o) => !["SHIPPED", "DELIVERED", "CANCELED", "CANCELLED"].includes(String(o.status).toUpperCase())).length;
    const couriersCount = couriers.filter((c) => c?.isActive !== false).length;
    const returnsCount = returnsList.length;

    return [
      {
        title: "Total Orders",
        value: total,
        subtitle: ordersMeta?.total ? `Shiprocket total: ${ordersMeta.total}` : "Live from Shiprocket",
        icon: ShoppingBag,
        gradient: "from-violet-500 to-purple-600",
      },
      {
        title: "Shipped",
        value: shipped,
        subtitle: "Orders in transit",
        icon: Truck,
        gradient: "from-sky-500 to-cyan-600",
      },
      {
        title: "Delivered",
        value: delivered,
        subtitle: "Completed orders",
        icon: PackageCheck,
        gradient: "from-emerald-500 to-green-600",
      },
      {
        title: "Pending",
        value: pending,
        subtitle: "New / processing / others",
        icon: Clock3,
        gradient: "from-amber-500 to-orange-600",
      },
      {
        title: "Couriers",
        value: couriersCount,
        subtitle: "Active DB couriers",
        icon: Route,
        gradient: "from-fuchsia-500 to-pink-600",
      },
      {
        title: "Returns",
        value: returnsCount,
        subtitle: "Return orders synced",
        icon: Undo2,
        gradient: "from-rose-500 to-red-600",
      },
    ];
  }, [orders, couriers, returnsList, ordersMeta]);

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
      if (sortBy === "latest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "customer") {
        return String(a.customerName).localeCompare(String(b.customerName));
      }
      return String(a.channelOrderId).localeCompare(String(b.channelOrderId));
    });
  }, [orders, search, statusFilter, sortBy]);

  const activeCouriers = useMemo(
    () => couriers.filter((courier) => courier?.isActive !== false),
    [couriers]
  );

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
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const showToast = (message, duration = 2500) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), duration);
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

  const refreshAll = async () => {
    setRefreshing(true);
    await loadDashboard();
    showToast("Dashboard refreshed");
  };

  const openInspection = (kind, title, data) => {
    setInspection({
      open: true,
      kind,
      title,
      data,
      showRaw: false,
    });
  };

  const closeInspection = () => {
    setInspection({
      open: false,
      kind: "order",
      title: "",
      data: null,
      showRaw: false,
    });
  };

  const openPayloadEditor = (kind, title, payload, submitLabel) => {
    setPayloadModal({
      open: true,
      kind,
      title,
      payload,
      submitLabel,
    });
  };

  const closePayloadEditor = () => {
    setPayloadModal({
      open: false,
      kind: "",
      title: "",
      payload: "",
      submitLabel: "Submit",
    });
  };

  const inspectOrder = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${row.shiprocketOrderId}`);
      const body = res.data?.data ?? res.data;
      const payload = body?.data && !Array.isArray(body.data) ? body.data : body;
      openInspection(
        "order",
        `Shiprocket Order · ${row.channelOrderId}`,
        payload
      );
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const inspectTracking = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/track/${row.shiprocketOrderId}`);
      const body = res.data?.data ?? res.data;
      openInspection(
        "tracking",
        `Tracking · ${row.channelOrderId}`,
        body
      );
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const inspectReturn = (row) => {
    openInspection("return", `Return Order · ${row.orderId}`, row.raw || row);
  };

  const inspectShipment = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }

    try {
      setShipmentActionLoading(true);
      const res = await api.get(`/shipment/${shipmentForm.shipmentDbId.trim()}`);
      const body = res.data?.data ?? res.data;
      setShipmentLookupResult(body);
      openInspection("shipment", `Shipment · ${shipmentForm.shipmentDbId.trim()}`, body);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const syncShipmentTracking = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }

    try {
      setShipmentActionLoading(true);
      const res = await api.post(`/shipment/${shipmentForm.shipmentDbId.trim()}/sync`);
      const body = res.data?.data ?? res.data;
      setShipmentLookupResult(body);
      openInspection("shipment", `Synced Shipment · ${shipmentForm.shipmentDbId.trim()}`, body);
      showToast("Shipment tracking synced");
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const assignAwb = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }
    if (!shipmentForm.courierId) {
      setError("Courier ID is required");
      return;
    }

    try {
      setShipmentActionLoading(true);
      const res = await api.post("/assign-awb", {
        shipmentDbId: shipmentForm.shipmentDbId.trim(),
        courierId: Number(shipmentForm.courierId),
      });
      const body = res.data?.data ?? res.data;
      setShipmentLookupResult(body);
      openInspection("shipment", `AWB Assigned · ${shipmentForm.shipmentDbId.trim()}`, body);
      showToast("AWB assigned");
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const requestPickup = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }

    try {
      setShipmentActionLoading(true);
      const res = await api.post("/pickup", {
        shipmentDbId: shipmentForm.shipmentDbId.trim(),
      });
      const body = res.data?.data ?? res.data;
      setShipmentLookupResult(body);
      openInspection("shipment", `Pickup Requested · ${shipmentForm.shipmentDbId.trim()}`, body);
      showToast("Pickup requested");
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const cancelShipment = async () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }

    if (!window.confirm(`Cancel shipment ${shipmentForm.shipmentDbId.trim()}?`)) return;

    try {
      setShipmentActionLoading(true);
      const res = await api.post("/cancel", {
        shipmentDbId: shipmentForm.shipmentDbId.trim(),
      });
      const body = res.data?.data ?? res.data;
      setShipmentLookupResult(body);
      openInspection("shipment", `Cancelled Shipment · ${shipmentForm.shipmentDbId.trim()}`, body);
      showToast("Shipment cancelled");
      await loadDashboard();
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setShipmentActionLoading(false);
    }
  };

  const downloadShipmentInvoice = () => {
    if (!shipmentForm.shipmentDbId.trim()) {
      setError("Shipment DB ID is required");
      return;
    }
    window.open(
      `/api/shipping/invoice/shipment/${shipmentForm.shipmentDbId.trim()}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const trackOrder = async (row) => {
    try {
      setLoading(true);
      const res = await api.get(`/track/${row.shiprocketOrderId}`);
      const body = res.data?.data ?? res.data;
      openInspection("tracking", `Tracking · ${row.channelOrderId}`, body);
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const openOrderInvoice = (row) => {
    window.open(
      `/api/shipping/invoice/order/${row.shiprocketOrderId}`,
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

  const openReturnCreate = (row) => {
    openPayloadEditor(
      "return-create",
      `Create Return Order · ${row.channelOrderId}`,
      buildReturnCreateTemplate(row),
      "Create Return"
    );
  };

  const openReturnUpdate = (row) => {
    openPayloadEditor(
      "return-update",
      `Update Return Order · ${row.orderId}`,
      buildReturnUpdateTemplate(row),
      "Update Return"
    );
  };

  const openExchangeCreate = (row) => {
    openPayloadEditor(
      "exchange-create",
      `Create Exchange Order · ${row.channelOrderId}`,
      buildExchangeTemplate(row),
      "Create Exchange"
    );
  };

  const submitPayload = async () => {
    try {
      const parsed = JSON.parse(payloadModal.payload);

      setLoading(true);

      if (payloadModal.kind === "return-create") {
        await api.post("/returns", parsed);
        showToast("Return order created");
      } else if (payloadModal.kind === "return-update") {
        await api.put("/returns", parsed);
        showToast("Return order updated");
      } else if (payloadModal.kind === "exchange-create") {
        await api.post("/exchange", parsed);
        showToast("Exchange order created");
      }

      closePayloadEditor();
      await loadDashboard();
    } catch (err) {
      setError(err instanceof SyntaxError ? "Invalid JSON payload" : readApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const runEstimate = async () => {
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
      const body = res.data?.data ?? res.data;
      setCouriers(safeArray(body));
      showToast("Couriers refreshed");
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  };

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
              description="Live Shiprocket orders, shipments, tracking, couriers, returns, exchanges, and backend actions."
              icon={LayoutDashboard}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionButton
                onClick={refreshAll}
                title="Refresh dashboard"
                variant="dark"
                disabled={refreshing || loading}
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </ActionButton>

              <ActionButton
                onClick={() => setViewMode("serviceability")}
                title="Jump to serviceability"
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
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
              <SectionTitle
                title="Shiprocket Orders"
                description="Essential order info first, raw response on demand, and quick backend actions."
                icon={ShoppingBag}
              />

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
              <table className="w-full min-w-[1240px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 text-left dark:bg-slate-950">
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shipment</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created</th>
                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
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
                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {row.channelOrderId}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Shiprocket ID: {row.shiprocketOrderId}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">{row.customerName}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.customerPhone}</p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="text-sm text-slate-700 dark:text-slate-200">
                            <p className="font-semibold">{row.paymentMethod || "-"}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Payment status: {row.paymentStatus}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                            <Truck size={15} className="text-sky-500" />
                            {row.courierName}
                          </div>
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            AWB: {row.awbCode || "Not generated"}
                          </div>
                        </td>

                        <td className="px-4 py-4 align-top text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(row.createdAt)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <IconButton onClick={() => inspectOrder(row)} title="View order details">
                              <Eye size={16} />
                            </IconButton>
                            <IconButton onClick={() => inspectTracking(row)} title="Track order">
                              <Route size={16} />
                            </IconButton>
                            <IconButton onClick={() => openOrderInvoice(row)} title="Invoice">
                              <ExternalLink size={16} />
                            </IconButton>
                            <IconButton onClick={() => cancelOrder(row)} title="Cancel order">
                              <X size={16} />
                            </IconButton>
                            <IconButton onClick={() => openReturnCreate(row)} title="Create return">
                              <Undo2 size={16} />
                            </IconButton>
                            <IconButton onClick={() => openExchangeCreate(row)} title="Create exchange">
                              <Upload size={16} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                          No orders found.
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
            className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"
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
                <ActionButton onClick={inspectShipment} title="Load shipment" disabled={shipmentActionLoading}>
                  {shipmentActionLoading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                  Load Shipment
                </ActionButton>
                <ActionButton onClick={syncShipmentTracking} title="Sync tracking" disabled={shipmentActionLoading}>
                  <RefreshCw size={16} />
                  Sync Tracking
                </ActionButton>
                <ActionButton onClick={assignAwb} title="Assign AWB" disabled={shipmentActionLoading}>
                  <PackageCheck size={16} />
                  Assign AWB
                </ActionButton>
                <ActionButton onClick={requestPickup} title="Request pickup" disabled={shipmentActionLoading}>
                  <ShieldCheck size={16} />
                  Request Pickup
                </ActionButton>
                <ActionButton onClick={downloadShipmentInvoice} title="Download invoice" disabled={shipmentActionLoading}>
                  <ExternalLink size={16} />
                  Invoice
                </ActionButton>
                <ActionButton onClick={cancelShipment} title="Cancel shipment" disabled={shipmentActionLoading}>
                  <X size={16} />
                  Cancel
                </ActionButton>
              </div>

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
              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
                <SectionTitle
                  title="Shipment Actions"
                  description="One-click backend wiring for shipment routes."
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

              <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
                <SectionTitle
                  title="Courier Master Data"
                  description="The shipment workflow uses the active courier list from /couriers/list."
                  icon={Truck}
                />
                <div className="mt-4 max-h-[300px] overflow-auto space-y-3">
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
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No couriers found.
                    </p>
                  )}
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
                    placeholder="600001"
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
                <ActionButton onClick={runEstimate} title="Get estimate" disabled={serviceabilityLoading}>
                  {serviceabilityLoading ? <Loader2 className="animate-spin" size={16} /> : <Clock3 size={16} />}
                  Estimate
                </ActionButton>
                <ActionButton onClick={runServiceabilityCheck} title="Check and store" disabled={serviceabilityLoading}>
                  <Upload size={16} />
                  Check & Store
                </ActionButton>
              </div>
            </div>

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
                          <span>Pod Available</span>
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No active couriers found.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6">
              <SectionTitle
                title="Courier Master / Serviceability"
                description="DB couriers are used by shipment actions. Serviceability checks live in the separate tab."
                icon={Route}
              />
              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Routes in use</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div>/api/shipping/couriers/list</div>
                  <div>/api/shipping/couriers</div>
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
            className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"
          >
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
                    {returnsList.length ? (
                      returnsList.map((row) => (
                        <tr
                          key={`${row.orderId}-${row.shipmentId}`}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {row.orderId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {row.shipmentId}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                            {row.status}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <ActionButton onClick={() => inspectReturn(row)} title="View return">
                                <Eye size={16} />
                                View
                              </ActionButton>
                              <ActionButton onClick={() => openReturnUpdate(row)} title="Update return">
                                <RefreshCw size={16} />
                                Update
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
              <SectionShell
                title="Create Return / Exchange"
                description="Use row actions in Orders, or seed the payload here from the first loaded order."
              >
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() => {
                      const first = filteredOrders[0];
                      if (!first) return setError("No order available to seed return payload");
                      openReturnCreate(first);
                    }}
                    title="Create return"
                  >
                    <Undo2 size={16} />
                    Create Return
                  </ActionButton>
                  <ActionButton
                    onClick={() => {
                      const first = filteredOrders[0];
                      if (!first) return setError("No order available to seed exchange payload");
                      openExchangeCreate(first);
                    }}
                    title="Create exchange"
                  >
                    <Upload size={16} />
                    Create Exchange
                  </ActionButton>
                </div>
              </SectionShell>

              <SectionShell
                title="Route Reference"
                description="These routes are mounted at /api/shipping"
              >
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div>POST /api/shipping/returns</div>
                  <div>PUT /api/shipping/returns</div>
                  <div>GET /api/shipping/returns</div>
                  <div>POST /api/shipping/exchange</div>
                </div>
              </SectionShell>
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
            All admin actions are wired to /api/shipping
          </div>
        </div>
      </div>

      <InspectionModal
        open={inspection.open}
        kind={inspection.kind}
        title={inspection.title}
        data={inspection.data}
        showRaw={inspection.showRaw}
        onToggleRaw={() =>
          setInspection((prev) => ({
            ...prev,
            showRaw: !prev.showRaw,
          }))
        }
        onClose={closeInspection}
        onCopy={async () => {
          const ok = await copyToClipboard(
            JSON.stringify(inspection.data ?? {}, null, 2)
          );
          if (ok) showToast("JSON copied");
        }}
      />

      <JsonEditorModal
        open={payloadModal.open}
        title={payloadModal.title}
        value={payloadModal.payload}
        setValue={(value) =>
          setPayloadModal((prev) => ({
            ...prev,
            payload: value,
          }))
        }
        onClose={closePayloadEditor}
        onSubmit={submitPayload}
        submitLabel={payloadModal.submitLabel}
      />
    </div>
  );
}
