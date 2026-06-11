import { motion } from "framer-motion";
import {
  Eye,
  ExternalLink,
  FileText,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";

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

export default function ShippingTable({
  shipments = [],
  onView,
  onTrack,
  onAssignAwb,
  onRequestPickup,
  onInvoice,
  onCancel,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Shipment queue
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review shipment progress, courier data, and order context.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <Truck size={13} />
            {shipments.length} record{shipments.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left dark:bg-slate-950">
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Order
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Customer
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Payment
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Shipment
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Created
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {shipments.length ? (
              shipments.map((row) => (
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
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {row.customerName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.customerPhone}
                      </p>
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
                    {row.createdAt}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionButton onClick={() => onView?.(row)} title="View order details">
                        <Eye size={16} />
                      </ActionButton>

                      <ActionButton onClick={() => onTrack?.(row)} title="Track order">
                        <RefreshCw size={16} />
                      </ActionButton>

                      <ActionButton onClick={() => onAssignAwb?.(row)} title="Assign AWB">
                        <PackageCheck size={16} />
                      </ActionButton>

                      <ActionButton onClick={() => onRequestPickup?.(row)} title="Request Pickup">
                        <ShieldCheck size={16} />
                      </ActionButton>

                      <ActionButton onClick={() => onInvoice?.(row)} title="Invoice">
                        <ExternalLink size={16} />
                      </ActionButton>

                      <ActionButton onClick={() => onCancel?.(row)} title="Cancel order">
                        <X size={16} />
                      </ActionButton>

                      <ActionButton onClick={() => onView?.(row)} title="Raw response">
                        <FileText size={16} />
                      </ActionButton>
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
  );
}
