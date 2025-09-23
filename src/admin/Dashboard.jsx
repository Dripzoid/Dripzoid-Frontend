// src/admin/Dashboard.jsx
import { useEffect, useState } from "react";
import {
  Users,
  IndianRupee,
  BarChart3,
  PackageSearch,
  ClipboardList,
  Calendar,
  Download,   // ✅ added
} from "lucide-react";
import { motion } from "framer-motion";
import api from "../utils/api";

const formatCurrency = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
    : "₹0.00";

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState("overall");
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState(() => {
    try {
      const d = new Date();
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7;
      target.setDate(d.getDate() - dayNr + 3);
      const firstThursday = new Date(target.getFullYear(), 0, 4);
      const diff = (target - firstThursday) / 86400000;
      const wk = 1 + Math.round(diff / 7);
      return `${target.getFullYear()}-W${String(wk).padStart(2, "0")}`;
    } catch {
      return "";
    }
  });

  const dateInputClass =
    "pl-3 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white text-black";

  const btnSecondaryBase = "px-4 py-2 rounded-xl border hover:opacity-90";
  const btnSecondaryLight = "bg-white text-black border-gray-300";
  const btnSecondaryDark = "dark:bg-black dark:text-white dark:border-gray-700";

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      let params = {};
      switch (range) {
        case "overall":
          params = { range: "overall" };
          break;
        case "monthly":
          params = { range: "monthly", month };
          break;
        case "weekly":
          params = { range: "weekly", week };
          break;
        case "daywise":
          params = date ? { range: "daywise", date } : { range: "daywise" };
          break;
        default:
          params = { range: "overall" };
      }
      const data = await api.get("/api/admin/stats", { params }, true);
      setStats(data || {});
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError(err?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, date, month, week]);

const handleExportData = async () => {
  try {
    // Request .db file with auth token and blob response
    const blob = await api.get("/api/admin/data-export", {}, true, true);

    // Create a URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dripzoid-backup-${new Date().toISOString().split("T")[0]}.db`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Export data failed:", err);
    alert("Failed to export database file");
  }
};


  const statCards = [
    { label: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "bg-blue-500" },
    { label: "Total Orders", value: stats.totalOrders || 0, icon: ClipboardList, color: "bg-green-500" },
    { label: "Total Sales", value: stats.totalSales ?? 0, icon: IndianRupee, color: "bg-yellow-500" },
  ];

  const tabs = [
    { key: "overall", label: "Overall", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "monthly", label: "Monthly", icon: <PackageSearch className="w-4 h-4" /> },
    { key: "weekly", label: "Weekly", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "daywise", label: "Daywise", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-4 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setRange(t.key);
                if (t.key === "daywise") {
                  setDate(new Date().toISOString().split("T")[0]);
                } else if (t.key === "monthly") {
                  setMonth(new Date().toISOString().slice(0, 7));
                } else if (t.key === "weekly") {
                  const d = new Date();
                  const target = new Date(d.valueOf());
                  const dayNr = (d.getDay() + 6) % 7;
                  target.setDate(d.getDate() - dayNr + 3);
                  const firstThursday = new Date(target.getFullYear(), 0, 4);
                  const diff = (target - firstThursday) / 86400000;
                  const wk = 1 + Math.round(diff / 7);
                  setWeek(`${target.getFullYear()}-W${String(wk).padStart(2, "0")}`);
                } else {
                  setDate("");
                }
              }}
              className={`flex items-center gap-2 ${
                range === t.key
                  ? "px-4 py-2 rounded-xl bg-black text-white border border-black dark:bg-white dark:text-black dark:border-white"
                  : `${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark} text-gray-700 dark:text-gray-200`
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}

          <div className="ml-auto flex items-center gap-3">
            {range === "monthly" && (
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={dateInputClass} />
            )}
            {range === "weekly" && (
              <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className={dateInputClass} />
            )}
            {range === "daywise" && (
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={dateInputClass} />
            )}

            <button onClick={fetchStats} className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark}`}>
              Refresh
            </button>

            {/* ✅ Export Data Button */}
            <button
              onClick={handleExportData}
              className={`${btnSecondaryBase} ${btnSecondaryLight} ${btnSecondaryDark} flex items-center gap-2`}
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>

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
                <div className="mt-2 text-3xl font-extrabold text-black dark:text-white">
                  {s.label === "Total Sales"
                    ? formatCurrency(Number(s.value ?? stats.totalSales ?? 0))
                    : s.value}
                </div>
              </div>
              <div className={`p-3 rounded-full ${s.color} text-white`}>
                <s.icon className="w-6 h-6" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
