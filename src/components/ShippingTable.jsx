import { motion } from "framer-motion";
import {
  Eye,
  RefreshCw,
  FileText,
  Truck,
  PackageCheck,
  MapPinned,
  MoreHorizontal,
} from "lucide-react";

const statusStyles = {
  Confirmed:
    "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  Shipped:
    "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  "Out For Delivery":
    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  Delivered:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  Cancelled:
    "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  RTO:
    "bg-yellow-500/10 text-yellow-700 ring-yellow-500/20 dark:text-yellow-300",
  Pending:
    "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset
        ${statusStyles[status] || "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300"}
      `}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

function ActionButton({ children, title, onClick, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`
        inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white
        text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950
        dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <PackageCheck size={40} />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
        No Shipments Found
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        Try adjusting your search, filters, or sort settings to reveal shipments.
      </p>
    </div>
  );
}

export default function ShippingTable({
  shipments = [],
  onView,
  onRefresh,
  onDocument,
  onMore,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full min-w-0 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900"
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
            <PackageCheck size={13} />
            {shipments.length} record{shipments.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {shipments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/95 text-left dark:bg-slate-950/90">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Order
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Customer
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Courier
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  AWB
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Shipment Status
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Order Status
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Location
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Date
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {shipments.map((shipment, index) => (
                <motion.tr
                  key={shipment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4 align-top">
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {shipment.orderNumber}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        #{shipment.id}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div>
                      <p className="font-medium text-slate-950 dark:text-white">
                        {shipment.customer}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {shipment.phone}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                      <Truck size={14} />
                      {shipment.courier}
                    </div>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800">
                      {shipment.awbCode}
                    </code>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <StatusBadge status={shipment.shipmentStatus} />
                  </td>

                  <td className="px-6 py-4 align-top">
                    <StatusBadge status={shipment.orderStatus} />
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPinned size={14} />
                      {shipment.city}, {shipment.state}
                    </div>
                  </td>

                  <td className="px-6 py-4 align-top text-sm text-slate-500 dark:text-slate-400">
                    {shipment.createdAt}
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <ActionButton
                        title="View"
                        onClick={() => onView?.(shipment)}
                      >
                        <Eye size={16} />
                      </ActionButton>

                      <ActionButton
                        title="Refresh Tracking"
                        onClick={() => onRefresh?.(shipment)}
                      >
                        <RefreshCw size={16} />
                      </ActionButton>

                      <ActionButton
                        title="Documents"
                        onClick={() => onDocument?.(shipment)}
                      >
                        <FileText size={16} />
                      </ActionButton>

                      <ActionButton
                        title="More"
                        onClick={() => onMore?.(shipment)}
                      >
                        <MoreHorizontal size={16} />
                      </ActionButton>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState />
      )}
    </motion.div>
  );
}
