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

export default function DashboardLayout() {
  const { user, login, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // --- Handle screen resize ---
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "";
  const AUTH_ME = `${BASE}/api/auth/me`;
  const ACCOUNT_BASE = `${BASE}/api/account`;

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  // --- Auth check ---
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
        if (tokenFromUrl) {
          try {
            const userData = await fetchMe(tokenFromUrl);
            if (!cancelled && isMountedRef.current) login(userData, tokenFromUrl);
          } catch {}
          finally {
            const newUrl = location.pathname + location.hash;
            window.history.replaceState({}, document.title, newUrl);
            if (!cancelled && isMountedRef.current) setCheckingAuth(false);
          }
          return;
        }
        try {
          const data = await fetchMe();
          if (!cancelled && isMountedRef.current && data?.user) {
            login(data.user, null);
          }
        } catch {}
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        if (!cancelled && isMountedRef.current) setCheckingAuth(false);
      }
    })();
    return () => (cancelled = true);
  }, []);

  // --- Redirect if not logged in ---
  useEffect(() => {
    if (!checkingAuth && !user && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [checkingAuth, user, location.pathname, navigate]);

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
    navigate("/login");
  };

  const links = [
    { to: "/account/profile", label: "Profile Overview", icon: <UserIcon size={18} /> },
    { to: "/account/orders", label: "My Orders", icon: <ShoppingBag size={18} /> },
    { to: "/account/wishlist", label: "Wishlist", icon: <Heart size={18} /> },
    { to: "/account/addresses", label: "Address Book", icon: <MapPin size={18} /> },
    { to: "/account/settings", label: "Account Settings", icon: <Settings size={18} /> },
  ];

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeSidebar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (checkingAuth) return null;

  const isProfileActive = (path) =>
    location.pathname === "/account" ||
    location.pathname === "/account/" ||
    location.pathname.startsWith("/account/profile");

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* === SIDEBAR === */}
      <aside
        className={`z-50 transform top-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-lg flex flex-col fixed h-full transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:static lg:w-64`}
      >
        {/* Mobile sidebar header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 lg:hidden">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Dashboard</h2>
          <button onClick={closeSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <XIcon size={20} />
          </button>
        </div>

        {/* Desktop sidebar title */}
        <div className="hidden lg:block">
          <h2 className="text-2xl font-extrabold p-6 text-gray-900 dark:text-white">Dashboard</h2>
        </div>

        {/* Sidebar navigation */}
        <nav className="flex flex-col flex-grow overflow-auto">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) => {
                const active =
                  isActive || (to === "/account/profile" && isProfileActive(to));
                return `flex items-center gap-3 px-6 py-4 font-semibold transition-colors duration-300 w-full ${
                  active
                    ? "bg-black text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`;
              }}
            >
              {icon} <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 text-xs text-center text-gray-500 dark:text-gray-400">
          <div>Logged in as</div>
          <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">
            {user?.email ?? user?.name ?? "Account"}
          </div>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <main
        className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-950
                   lg:ml-64 rounded-tl-0 lg:rounded-tl-3xl lg:rounded-bl-3xl
                   shadow-none lg:shadow-lg min-h-screen overflow-auto"
      >
        <div className="max-w-7xl w-full mx-auto">
          {/* Conditional Header (Desktop vs Mobile) */}
          {isDesktop ? (
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Welcome, {user?.name || "User"}!
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage your account, orders, and preferences from here.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 
                          dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60 
                          font-semibold text-sm flex items-center gap-2 transition"
              >
                <LogOut size={16} /> Logout
              </button>
            </header>
          ) : (
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={openSidebar}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MenuIcon size={20} />
                </button>
                <span className="text-lg font-semibold">
                  Hi, {user?.name ? user.name.split(" ")[0] : "User"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-rose-600"
              >
                <LogOut size={20} />
              </button>
            </header>
          )}

          {/* Page Content */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
