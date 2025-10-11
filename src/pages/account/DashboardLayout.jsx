// src/layouts/DashboardLayout.jsx
import React, { useContext, useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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

/**
 * DashboardLayout
 *
 * Changes:
 * - Removed "Payment Methods" section from the sidebar.
 * - Added mobile-responsive sidebar:
 *   - On small screens the sidebar is hidden by default and toggled via a hamburger button.
 *   - When opened, the sidebar appears as an accessible off-canvas drawer with an overlay.
 * - Sidebar closes automatically on navigation or when pressing Escape.
 * - Kept existing session / auth logic intact.
 *
 * Minor fixes:
 * - Force remount of Outlet on route changes via key={location.pathname}
 * - Use navigate(..., { replace: true }) after logout to avoid history clutter
 */

export default function DashboardLayout() {
  const { user, login, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "";
  const AUTH_ME = `${BASE}/api/auth/me`;
  const ACCOUNT_BASE = `${BASE}/api/account`;

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // ---------- Session Check ----------
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

        // OAuth redirect handling
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

  // ---------- Redirects ----------
  useEffect(() => {
    if (!checkingAuth && !user && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [checkingAuth, user, navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token"); // get token from localStorage

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

    // Clear frontend state regardless of backend response
    logout();
    navigate("/login", { replace: true });
  };

  // Sidebar links - removed Payment Methods entry
  const links = [
    { to: "/account/profile", label: "Profile Overview", icon: <UserIcon size={18} /> },
    { to: "/account/orders", label: "My Orders", icon: <ShoppingBag size={18} /> },
    { to: "/account/wishlist", label: "Wishlist", icon: <Heart size={18} /> },
    { to: "/account/addresses", label: "Address Book", icon: <MapPin size={18} /> },
    { to: "/account/settings", label: "Account Settings", icon: <Settings size={18} /> },
  ];

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  // Close sidebar on navigation
  useEffect(() => {
    closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Don't render dashboard until auth check is done
  if (checkingAuth) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile: top bar with hamburger */}
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
            <div className="text-sm">Welcome, {user?.name || "User"}</div>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-md bg-rose-50 text-rose-600 text-sm"
            >
              <LogOut size={16} className="inline-block mr-2" /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - desktop visible, mobile off-canvas */}
      {/* Overlay for mobile when open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`z-50 transform top-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-lg flex flex-col fixed h-full transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:relative lg:h-auto lg:w-64`}
        aria-hidden={!sidebarOpen && window.innerWidth < 1024}
      >
        {/* Mobile header inside sidebar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 lg:hidden">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Dashboard</h2>
          <button onClick={closeSidebar} aria-label="Close menu" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <XIcon size={20} />
          </button>
        </div>

        {/* Desktop header (hidden on mobile because topbar shows title) */}
        <div className="hidden lg:block">
          <h2 className="text-2xl font-extrabold p-6 text-gray-900 dark:text-white">Dashboard</h2>
        </div>

        <nav className="flex flex-col flex-grow overflow-auto">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => closeSidebar()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-4 font-semibold transition-colors duration-300 w-full ${(to === "/account/profile" &&
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
            onClick={() => { closeSidebar(); handleLogout(); }}
            className="w-full flex items-center gap-3 px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 font-semibold"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 flex-shrink-0 min-w-0 p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-950
                   rounded-tl-0 lg:rounded-tl-3xl lg:rounded-bl-3xl shadow-none lg:shadow-lg min-h-screen overflow-auto"
      >
        <div className="max-w-7xl w-full mx-auto">
          {/* Desktop header (shows name & optional controls) */}
          <header className="hidden lg:flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Welcome, {user?.name || "User"}!</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md bg-rose-50 text-rose-600 font-semibold"
              >
                <LogOut size={16} className="inline-block mr-2" /> Logout
              </button>
            </div>
          </header>

          {/* Mobile header (when not using the top bar) */}
          <header className="lg:hidden mb-4">
            {/* show simple greeting on mobile content area */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Hello, {user?.name || "User"}!</h2>
            </div>
          </header>

          {/* Force outlet to remount on pathname change to ensure immediate render when route changes */}
          <Outlet key={location.pathname} />
        </div>
      </main>
    </div>
  );
}
