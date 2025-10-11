import React, { useContext, useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserContext } from "../../contexts/UserContext";
import {
  LogOut,
  User as UserIcon,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  Menu as MenuIcon,
  X as XIcon,
} from "lucide-react";

export default function DashboardLayout() {
  const { user, login, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMountedRef = useRef(true);

  const BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "";
  const AUTH_ME = `${BASE}/api/auth/me`;
  const ACCOUNT_BASE = `${BASE}/api/account`;

  // Keep mounted ref
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Remove query params (e.g., after OAuth)
  const removeQueryParams = () => {
    const newUrl = location.pathname + location.hash;
    window.history.replaceState({}, document.title, newUrl);
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };

  const fetchMe = async (token) => {
    const res = await fetchWithTimeout(AUTH_ME, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Auth failed (${res.status})`);
    return res.json();
  };

  // 🧩 Session Check
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (user) {
        setCheckingAuth(false);
        return;
      }

      try {
        const params = new URLSearchParams(location.search);
        const tokenFromUrl = params.get("token");

        // OAuth redirect
        if (tokenFromUrl) {
          try {
            const userData = await fetchMe(tokenFromUrl);
            if (!cancelled && isMountedRef.current) {
              login(userData, tokenFromUrl);
            }
          } catch {
            /* ignore */
          } finally {
            removeQueryParams();
            if (!cancelled && isMountedRef.current) setCheckingAuth(false);
          }
          return;
        }

        // Cookie session fallback
        try {
          const data = await fetchMe();
          if (!cancelled && isMountedRef.current && data?.user) {
            login(data.user, null);
          }
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        if (!cancelled && isMountedRef.current) setCheckingAuth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🧭 Redirect to login if not authenticated
  useEffect(() => {
    if (!checkingAuth && !user && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [checkingAuth, user, navigate, location.pathname]);

  // 🚪 Logout
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${ACCOUNT_BASE}/signout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    logout();
    navigate("/login", { replace: true });
  };

  // Sidebar links
  const links = [
    { to: "/account/profile", label: "Profile Overview", icon: <UserIcon size={18} /> },
    { to: "/account/orders", label: "My Orders", icon: <ShoppingBag size={18} /> },
    { to: "/account/wishlist", label: "Wishlist", icon: <Heart size={18} /> },
    { to: "/account/addresses", label: "Address Book", icon: <MapPin size={18} /> },
    { to: "/account/settings", label: "Account Settings", icon: <Settings size={18} /> },
  ];

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  // Close sidebar on navigation
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (checkingAuth) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile Topbar */}
      <div className="lg:hidden w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={openSidebar}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MenuIcon size={20} />
            </button>
            <div className="text-lg font-bold">Dashboard</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm">Hi, {user?.name || "User"}</div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-md bg-rose-50 text-rose-600 text-sm"
            >
              <LogOut size={16} className="inline-block mr-1" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`z-50 fixed lg:relative top-0 left-0 h-full w-72 lg:w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 lg:hidden">
          <h2 className="text-xl font-extrabold">Dashboard</h2>
          <button
            onClick={closeSidebar}
            aria-label="Close menu"
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="hidden lg:block p-6">
          <h2 className="text-2xl font-extrabold">Dashboard</h2>
        </div>

        <nav className="flex flex-col flex-grow overflow-auto">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 font-semibold transition-colors duration-300 w-full ${
                  (to === "/account/profile" &&
                    (location.pathname === "/account" || isActive)) ||
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`
              }
            >
              {icon} {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => {
              closeSidebar();
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold transition-colors"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-950 rounded-tl-none lg:rounded-tl-3xl lg:rounded-bl-3xl shadow-none lg:shadow-lg overflow-auto">
        <div className="max-w-7xl w-full mx-auto">
          {/* Desktop header */}
          <header className="hidden lg:flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Welcome, {user?.name || "User"}!</h1>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md bg-rose-50 text-rose-600 font-semibold"
            >
              <LogOut size={16} className="inline-block mr-1" /> Logout
            </button>
          </header>

          {/* Mobile header */}
          <header className="lg:hidden mb-4">
            <h2 className="text-xl font-semibold">Hello, {user?.name || "User"}!</h2>
          </header>

          {/* Animated Outlet */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet key={location.pathname} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
