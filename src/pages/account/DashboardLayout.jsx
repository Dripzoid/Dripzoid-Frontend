import React, { useContext, useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import {
  LogOut,
  User as UserIcon,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  Settings,
} from "lucide-react";

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
          } catch { }
          finally {
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
        } catch { }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        if (!cancelled && isMountedRef.current) setCheckingAuth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Redirects ----------
  useEffect(() => {
    if (!checkingAuth && !user && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [checkingAuth, user, navigate, location.pathname]);

  const handleLogout = async () => {
  try {
    const token = localStorage.getItem("token"); // 🔑 get token from localStorage

    await fetch(`${ACCOUNT_BASE}/signout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "", // ✅ attach token
      },
      credentials: "include", // keep cookies in sync
    });
  } catch (err) {
    console.error("Logout error:", err);
  }

  // Clear frontend state regardless of backend response
  logout();
  navigate("/login");
};


  const links = [
    { to: "/account/profile", label: "Profile Overview", icon: <UserIcon size={18} /> },
    { to: "/account/orders", label: "My Orders", icon: <ShoppingBag size={18} /> },
    { to: "/account/wishlist", label: "Wishlist", icon: <Heart size={18} /> },
    { to: "/account/addresses", label: "Address Book", icon: <MapPin size={18} /> },
    { to: "/account/payment-methods", label: "Payment Methods", icon: <CreditCard size={18} /> },
    { to: "/account/settings", label: "Account Settings", icon: <Settings size={18} /> },
  ];

  // Don't render dashboard until auth check is done
  if (checkingAuth) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
        <h2 className="text-2xl font-extrabold p-6 text-gray-900 dark:text-white">Dashboard</h2>
        <nav className="flex flex-col flex-grow">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
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

        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-6 py-4 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 w-full font-semibold"
        >
          <LogOut size={20} /> Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex-shrink-0 min-w-0 p-8 bg-white dark:bg-gray-950 
                      rounded-tl-3xl rounded-bl-3xl shadow-lg min-h-screen overflow-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome, {user?.name || "User"}!</h1>
        </header>
        <Outlet />
      </main>

    </div>
  );
}
