import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  Package,
  PackageCheck,
  MapPinned,
  Search,
  RefreshCw,
  Filter,
  CircleAlert,
  TrendingUp,
  Clock3,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  Route,
  BadgeCheck,
  X,
  Orbit,
} from "lucide-react";

import ShippingTable from "../components/ShippingTable";
import ShipmentDetailsModal from "../components/ShipmentDetailsModal";

const mockShipments = [
  {
    id: "1",
    orderNumber: "DRIP-20260610-001",
    customer: "Sainadh Chowdary",
    phone: "9390942546",
    courier: "Delhivery",
    awbCode: "AWB123456789",
    shipmentStatus: "Shipped",
    orderStatus: "Shipped",
    createdAt: "2026-06-10",
    city: "Guntur",
    state: "Andhra Pradesh",
  },
  {
    id: "2",
    orderNumber: "DRIP-20260610-002",
    customer: "Teja",
    phone: "9876543210",
    courier: "Blue Dart",
    awbCode: "AWB987654321",
    shipmentStatus: "Delivered",
    orderStatus: "Delivered",
    createdAt: "2026-06-09",
    city: "Kakinada",
    state: "Andhra Pradesh",
  },
  {
    id: "3",
    orderNumber: "DRIP-20260610-003",
    customer: "Ram",
    phone: "9123456789",
    courier: "DTDC",
    awbCode: "AWB567891234",
    shipmentStatus: "Out For Delivery",
    orderStatus: "Out For Delivery",
    createdAt: "2026-06-10",
    city: "Vijayawada",
    state: "Andhra Pradesh",
  },
];

const statusOptions = [
  "All",
  "Confirmed",
  "Shipped",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
];

const courierOptions = ["All", "Delhivery", "Blue Dart", "DTDC"];

const sortOptions = [
  { value: "latest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "customer", label: "Customer A–Z" },
  { value: "order", label: "Order number" },
];

function statusTone(status) {
  switch (status) {
    case "Delivered":
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300";
    case "Shipped":
      return "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300";
    case "Out For Delivery":
      return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300";
    case "Confirmed":
      return "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300";
    case "Cancelled":
      return "bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300";
    default:
      return "bg-gray-500/10 text-gray-700 ring-gray-500/20 dark:text-gray-300";
  }
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

export default function AdminShipping() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [courier, setCourier] = useState("All");
  const [sortBy, setSortBy] = useState("latest");
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date());

  const filteredShipments = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = mockShipments.filter((shipment) => {
      const matchesSearch =
        shipment.orderNumber.toLowerCase().includes(q) ||
        shipment.customer.toLowerCase().includes(q) ||
        shipment.awbCode.toLowerCase().includes(q) ||
        shipment.city.toLowerCase().includes(q) ||
        shipment.state.toLowerCase().includes(q);

      const matchesStatus = status === "All" || shipment.shipmentStatus === status;
      const matchesCourier = courier === "All" || shipment.courier === courier;

      return matchesSearch && matchesStatus && matchesCourier;
    });

    const sorted = [...list].sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "customer") {
        return a.customer.localeCompare(b.customer);
      }
      return a.orderNumber.localeCompare(b.orderNumber);
    });

    return sorted;
  }, [search, status, courier, sortBy]);

  const stats = useMemo(() => {
    const total = mockShipments.length;
    const shipped = mockShipments.filter((s) => s.shipmentStatus === "Shipped").length;
    const delivered = mockShipments.filter((s) => s.shipmentStatus === "Delivered").length;
    const ofd = mockShipments.filter((s) => s.shipmentStatus === "Out For Delivery").length;
    const confirmed = mockShipments.filter((s) => s.shipmentStatus === "Confirmed").length;
    const cancelled = mockShipments.filter((s) => s.shipmentStatus === "Cancelled").length;
    const activeCarriers = new Set(mockShipments.map((s) => s.courier)).size;
    const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;

    return {
      total,
      shipped,
      delivered,
      ofd,
      confirmed,
      cancelled,
      activeCarriers,
      deliveryRate,
    };
  }, []);

  const statCards = [
    {
      title: "Total Shipments",
      value: stats.total,
      subtitle: "All orders in the pipeline",
      icon: Package,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "Shipped",
      value: stats.shipped,
      subtitle: "Ready and in transit",
      icon: Truck,
      gradient: "from-sky-500 to-cyan-600",
    },
    {
      title: "Out For Delivery",
      value: stats.ofd,
      subtitle: "Last-mile delivery stage",
      icon: MapPinned,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      title: "Delivered",
      value: stats.delivered,
      subtitle: "Successfully completed",
      icon: PackageCheck,
      gradient: "from-emerald-500 to-green-600",
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setStatus("All");
    setCourier("All");
    setSortBy("latest");
  };

  const refreshData = () => {
    setIsRefreshing(true);
    setLastSyncedAt(new Date());

    window.setTimeout(() => {
      setIsRefreshing(false);
    }, 900);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastSyncedAt(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const activeFiltersCount =
    (search ? 1 : 0) + (status !== "All" ? 1 : 0) + (courier !== "All" ? 1 : 0) + (sortBy !== "latest" ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_20px_80px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 sm:p-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_28%)]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                <Sparkles size={14} />
                Advanced Shipping Control Center
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Shipping Management
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                  Monitor shipment lifecycles, filter by courier and status, inspect individual
                  orders, and keep fulfillment operations clean and fast.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Webhook-ready workflow
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <Route size={16} className="text-violet-500" />
                  Courier-aware tracking
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <BadgeCheck size={16} className="text-sky-500" />
                  Live operational visibility
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X size={16} />
                Clear Filters
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className="group overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-20px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-900"
              >
                <div className={`bg-gradient-to-br ${card.gradient} p-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                      <Icon size={22} />
                    </div>
                    <TrendingUp size={18} className="opacity-90" />
                  </div>

                  <div className="mt-6">
                    <h3 className="text-3xl font-black">{card.value}</h3>
                    <p className="mt-1 text-sm/6 text-white/90">{card.title}</p>
                    <p className="mt-2 text-xs text-white/80">{card.subtitle}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold">Operations overview</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Monitor shipment health and filter the queue in seconds.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <Clock3 size={14} className="text-slate-500" />
                  Synced {formatDate(lastSyncedAt)}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <Orbit size={14} />
                  Auto monitoring active
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orders, customer, AWB, city, or state..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                />
              </div>

              <div className="relative">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
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
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-white"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {courierOptions.map((option) => {
                const active = courier === option;
                return (
                  <button
                    key={option}
                    onClick={() => setCourier(option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <SlidersHorizontal size={16} />
                <span>
                  Showing <span className="font-bold text-slate-950 dark:text-white">{filteredShipments.length}</span>{" "}
                  shipment{filteredShipments.length === 1 ? "" : "s"}
                  {activeFiltersCount > 0 ? ` across ${activeFiltersCount} active filter${activeFiltersCount === 1 ? "" : "s"}` : ""}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-2.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-500 transition-all"
                    style={{ width: `${stats.deliveryRate}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {stats.deliveryRate}% delivered
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-3xl border border-white/70 bg-white p-5 shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Courier health</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Quick operational signals for the shipping desk.
                </p>
              </div>
              <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-600 dark:text-violet-300">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Truck size={14} />
                  Active couriers
                </div>
                <p className="mt-2 text-2xl font-black">{stats.activeCarriers}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <PackageCheck size={14} />
                  Delivered
                </div>
                <p className="mt-2 text-2xl font-black">{stats.delivered}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <CircleAlert size={14} />
                  Need attention
                </div>
                <p className="mt-2 text-2xl font-black">{stats.cancelled}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <BadgeCheck size={14} />
                  Fulfillment rate
                </div>
                <p className="mt-2 text-2xl font-black">{stats.deliveryRate}%</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <CircleAlert size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Webhook integration pending</p>
                  <p className="mt-1 text-sm leading-6 opacity-90">
                    Shipment updates are still refreshed manually. Once your courier webhooks are
                    connected, this panel can become fully live.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Shipment queue</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Tap a shipment to inspect tracking, order context, and delivery status.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <Sparkles size={13} />
                Modern Tailwind UI
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5">
            <AnimatePresence mode="wait">
              {filteredShipments.length > 0 ? (
               <ShippingTable
  shipments={filteredShipments}
  onView={(shipment) => setSelectedShipment(shipment)}
/>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="rounded-2xl bg-slate-900 p-4 text-white dark:bg-white dark:text-slate-950">
                    <Search size={22} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold">No shipments found</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Try changing the search text, status, courier, or sorting to reveal shipments
                    again.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="mt-5 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                  >
                    Reset filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Clock3 size={14} />
            Last synced {formatDate(lastSyncedAt)}
          </div>

          <div className="flex items-center gap-2">
            <Package size={14} />
            Fulfillment dashboard optimized for quick decision-making
          </div>
        </div>
      </div>

      <ShipmentDetailsModal
        shipment={selectedShipment}
        open={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
      />
    </div>
  );
}
