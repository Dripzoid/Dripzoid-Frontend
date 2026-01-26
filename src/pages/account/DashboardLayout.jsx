// src/components/DashboardLayout.jsx
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
  MessageSquare,
  Gift,
  CheckCircle,
  Star,
  Mail,
  LifeBuoy,
  Clock,
  Clipboard,
  Home,
} from "lucide-react";

/**
 * Modern Dashboard Layout
 * - Hooks are declared unconditionally (no ESLint hooks errors)
 * - Responsive: sticky desktop sidebar + mobile bottom nav
 * - Modern Tailwind UI: glass panels, gradients, smooth transitions
 *
 * Expects: UserContext providing { user, login, logout }
 */

export default function DashboardLayout() {
  // CONTEXT / NAV
  const { user, login, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // HOOKS (unconditional)
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  // UX state
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [trackInput, setTrackInput] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(() => {
    try {
      return localStorage.getItem("dashboard.newsletter") === "true";
    } catch {
      return false;
    }
  });

  const isMountedRef = useRef(true);

  // API base
  const BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "";
  const AUTH_ME = `${BASE}/api/auth/me`;
  const ACCOUNT_BASE = `${BASE}/api/account`;

  // HELPERS
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
    const res = await fetchWithTimeout(
      AUTH_ME,
      {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      },
      10000
    );
    if (!res.ok) throw new Error(`Auth failed (${res.status})`);
    return res.json();
  };

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  // EFFECTS (unconditional)
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Authentication check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user) {
        if (!cancelled && isMountedRef.current) setCheckingAuth(false);
        return;
      }

      try {
        const params = new URLSearchParams(location.search);
        const tokenFromUrl = params.get("token");
        if (tokenFromUrl) {
          try {
            const userData = await fetchMe(tokenFromUrl);
            if (!cancelled && isMountedRef.current) login(userData, tokenFromUrl);
          } catch {
            // ignore errors
          } finally {
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
        } catch {
          // ignore
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

  // redirect if not logged in
  useEffect(() => {
    if (!checkingAuth && !user && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [checkingAuth, user, location.pathname, navigate]);

  // load recent orders preview
  useEffect(() => {
    let mounted = true;
    async function loadRecent() {
      setRecentLoading(true);
      try {
        const res = await fetchWithTimeout(
          `${ACCOUNT_BASE}/orders?limit=3`,
          { credentials: "include" },
          7000
        ).catch(() => null);

        if (!res || !res.ok) {
          if (mounted) setRecentOrders([]);
          return;
        }

        const json = await res.json().catch(() => null);
        if (mounted && json) {
          const arr = Array.isArray(json) ? json : json.orders ?? json.data ?? [];
          setRecentOrders(Array.isArray(arr) ? arr : []);
        }
      } catch (err) {
        console.warn("Could not load recent orders", err);
        if (mounted) setRecentOrders([]);
      } finally {
        if (mounted) setRecentLoading(false);
      }
    }

    loadRecent();
    return () => (mounted = false);
  }, [user?.id]);

  // close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  // escape key closes sidebar
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeSidebar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ACTIONS
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

  const goToOrders = () => navigate("/account/orders");
  const goToWishlist = () => navigate("/account/wishlist");
  const goToAddresses = () => navigate("/account/addresses");

  const openWhatsAppSupport = () => {
    const phone = "+919494038163";
    const text = encodeURIComponent("Hi Dripzoid Support — I need help with my order.");
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${text}`, "_blank");
  };

  const copyReferral = async (referralCode) => {
    try {
      await navigator.clipboard.writeText(referralCode);
      // unobtrusive toast fallback
      if (typeof window !== "undefined" && "Notification" in window) {
        // simple alert as fallback
        alert("Referral code copied to clipboard!");
      } else {
        alert("Referral code copied to clipboard!");
      }
    } catch {
      prompt("Copy referral code:", referralCode);
    }
  };

  const toggleNewsletter = () => {
    const next = !newsletterSubscribed;
    setNewsletterSubscribed(next);
    try {
      localStorage.setItem("dashboard.newsletter", next ? "true" : "false");
    } catch {}
  };

  // DERIVED
  const referralCode = user?.referralCode ?? `DRP-${user?.id ?? "guest"}`;

  const profileCompleteness = (() => {
    if (!user) return 0;
    const checks = [
      !!user.name,
      !!user.email,
      !!user.phone || !!user.mobile,
      Array.isArray(user.addresses) && user.addresses.length > 0,
      !!user.referralCode,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  })();

  const isProfileActive = () =>
    location.pathname === "/account" ||
    location.pathname === "/account/" ||
    location.pathname.startsWith("/account/profile");

  // simple avatar (initials)
  const userInitials = (() => {
    if (!user?.name) return "D";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  })();

  // LOADING SKELETON WHEN CHECKING AUTH
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse w-full max-w-5xl p-6">
          <div className="h-10 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-40 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-40 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  // MARKUP
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* top placeholder for fixed navbar offset */}
      <div className="h-16" />

      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="relative flex gap-6">
          {/* SIDEBAR - sticky on desktop */}
          <aside
            className={`fixed z-40 inset-y-16 left-4 w-72 max-w-[18rem] transform transition-transform duration-300 lg:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } lg:relative lg:sticky lg:top-20 lg:translate-x-0`}
            aria-hidden={!sidebarOpen && !isDesktop}
          >
            <div className="h-full flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-white/60 to-white/30 dark:from-gray-900/80 dark:to-gray-950/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-lg">
              {/* header */}
              <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-amber-400 text-white font-bold text-lg shadow"
                  title="Dripzoid"
                >
                  DZ
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{user?.name ?? "Dripzoid User"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email ?? "—"}</div>
                </div>

                <button
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* nav */}
              <nav className="px-3 py-4 flex-1 overflow-auto space-y-1">
                {[
                  { to: "/account/profile", label: "Profile Overview", icon: <UserIcon size={16} /> },
                  { to: "/account/orders", label: "My Orders", icon: <ShoppingBag size={16} /> },
                  { to: "/account/wishlist", label: "Wishlist", icon: <Heart size={16} /> },
                  { to: "/account/addresses", label: "Address Book", icon: <MapPin size={16} /> },
                  { to: "/account/settings", label: "Account Settings", icon: <Settings size={16} /> },
                ].map(({ to, label, icon }) => (
                  <NavLink
                    to={to}
                    key={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-gradient-to-r from-rose-500 to-amber-400 text-white shadow-md"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`
                    }
                  >
                    <div className="w-6 h-6 flex items-center justify-center opacity-90">{icon}</div>
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* footer quick */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-600 to-amber-400 flex items-center justify-center text-white font-semibold">
                      {userInitials}
                    </div>
                    <div className="text-xs">
                      <div className="font-medium">{user?.name ?? "Your name"}</div>
                      <div className="text-gray-500 dark:text-gray-400">Member</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs px-3 py-2 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 hover:opacity-95 transition"
                  >
                    <LogOut size={14} className="inline-block mr-1" /> Logout
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate("/account/orders")}
                    className="text-xs flex items-center gap-2 justify-center px-3 py-2 rounded-md bg-white dark:bg-gray-800 hover:shadow-sm transition"
                  >
                    <ShoppingBag size={14} /> Orders
                  </button>
                  <button
                    onClick={() => navigate("/account/wishlist")}
                    className="text-xs flex items-center gap-2 justify-center px-3 py-2 rounded-md bg-white dark:bg-gray-800 hover:shadow-sm transition"
                  >
                    <Heart size={14} /> Wishlist
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* overlay for mobile (when sidebar open) */}
          {!isDesktop && sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/40 lg:hidden"
              aria-hidden="true"
            />
          )}

          {/* MAIN CONTENT */}
          <main className="flex-1 min-w-0 ml-0 lg:ml-[18rem]">
            {/* header row */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                {/* mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 bg-white/60 dark:bg-gray-800 rounded-lg shadow-sm lg:hidden"
                  aria-label="Open sidebar"
                >
                  <MenuIcon size={18} />
                </button>

                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold">Welcome, {user?.name ? user.name.split(" ")[0] : "User"} 👋</h1>
                  <div className="text-xs px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600">
                    {user?.loyaltyPoints ?? 0} pts
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-white to-white/60 dark:from-gray-900/60 dark:to-gray-900/40 px-3 py-2 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="text-xs text-gray-500">Profile</div>
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white grid place-items-center font-semibold">
                    {userInitials}
                  </div>
                </div>

                <button
                  onClick={() => navigate("/account/notifications")}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  title="Notifications"
                >
                  <Clock size={18} />
                </button>

                <button
                  onClick={openWhatsAppSupport}
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-green-600 text-white text-sm shadow hover:brightness-95 transition"
                >
                  <MessageSquare size={14} /> Chat Support
                </button>
              </div>
            </div>

            {/* dashboard summary grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Promo card */}
              <section className="col-span-1 lg:col-span-1 rounded-2xl p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900/70 dark:to-gray-950/60 border border-gray-100 dark:border-gray-800 shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Announcement</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Free shipping on prepaid orders above ₹999 — limited time.</p>
                  </div>
                  <div className="bg-rose-100 text-rose-600 p-2 rounded-full">
                    <Gift size={18} />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button onClick={() => navigate("/collections")} className="px-4 py-2 rounded-full bg-rose-500 text-white text-sm shadow hover:scale-[1.02] transition">
                    Shop Collections
                  </button>
                  <button onClick={() => navigate("/account/orders")} className="px-4 py-2 rounded-full border text-sm">
                    View Orders
                  </button>
                </div>
              </section>

              {/* account summary */}
              <section className="col-span-1 rounded-2xl p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Account Summary</h3>
                    <p className="text-sm text-gray-500 mt-1">Quick snapshot of your profile & rewards</p>
                  </div>
                  <CheckCircle size={36} className="text-emerald-500" />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Profile completeness</span>
                    <span className="font-medium">{profileCompleteness}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div style={{ width: `${profileCompleteness}%` }} className="h-full bg-gradient-to-r from-rose-500 to-amber-400" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
                      <div className="text-xs text-gray-500">Verified</div>
                      <div className="mt-1 font-medium">{user?.email ? "Email" : "—"}</div>
                    </div>
                    <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
                      <div className="text-xs text-gray-500">Saved Addresses</div>
                      <div className="mt-1 font-medium">{Array.isArray(user?.addresses) ? user.addresses.length : 0}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button onClick={() => navigate("/account/profile")} className="px-4 py-2 rounded-lg bg-black text-white text-sm">
                      Edit Profile
                    </button>
                    <button onClick={() => navigate("/account/settings")} className="px-4 py-2 rounded-lg border text-sm">
                      Account Settings
                    </button>
                  </div>
                </div>
              </section>

              {/* orders/referral */}
              <section className="col-span-1 rounded-2xl p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Recent Orders</h3>
                    <p className="text-sm text-gray-500 mt-1">Latest purchases</p>
                  </div>
                  <button onClick={goToOrders} className="text-sm text-gray-500 hover:underline">View all</button>
                </div>

                <div className="mt-4">
                  {recentLoading ? (
                    <div className="text-sm text-gray-500">Loading...</div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-sm text-gray-500">No recent orders found.</div>
                  ) : (
                    <ul className="space-y-3">
                      {recentOrders.map((o) => (
                        <li key={o.id || o.orderId} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{o.title || `Order #${o.id || o.orderId}`}</div>
                            <div className="text-xs text-gray-500">{o.status || o.order_status || "—"}</div>
                          </div>
                          <div className="text-sm text-gray-600">{o.total ? `₹${o.total}` : ""}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="text-sm text-gray-500 mb-2">Refer & Earn</div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-800 font-mono text-sm">{referralCode}</div>
                    <button onClick={() => copyReferral(referralCode)} className="px-3 py-2 rounded-md bg-black text-white">Copy</button>
                    <button
                      onClick={() =>
                        navigator.share
                          ? navigator.share({ title: "Join Dripzoid", text: `Use my code ${referralCode} at dripzoid.com`, url: window.location.origin })
                          : alert("Use copy to share")
                      }
                      className="px-3 py-2 rounded-md border"
                    >
                      Share
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* expanded content area (Outlet) */}
            <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed inset-x-0 bottom-4 z-50 mx-auto max-w-md px-4 lg:hidden">
        <div className="bg-white/90 dark:bg-gray-900/80 backdrop-blur rounded-full px-3 py-2 flex items-center justify-between shadow-lg border border-gray-100 dark:border-gray-800">
          <button onClick={() => navigate("/")} className="flex flex-col items-center text-xs text-gray-600 dark:text-gray-300">
            <Home size={18} />
            <span>Home</span>
          </button>

          <button onClick={goToOrders} className="flex flex-col items-center text-xs text-gray-600 dark:text-gray-300">
            <ShoppingBag size={18} />
            <span>Orders</span>
          </button>

          <button onClick={goToWishlist} className="flex flex-col items-center text-xs text-gray-600 dark:text-gray-300">
            <Heart size={18} />
            <span>Wishlist</span>
          </button>

          <button onClick={() => openWhatsAppSupport()} className="flex flex-col items-center text-xs text-gray-600 dark:text-gray-300">
            <MessageSquare size={18} />
            <span>Support</span>
          </button>

          <button onClick={() => navigate("/account/profile")} className="flex flex-col items-center text-xs text-gray-600 dark:text-gray-300">
            <UserIcon size={18} />
            <span>Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
