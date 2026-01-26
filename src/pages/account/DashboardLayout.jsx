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
  Phone,
  MessageSquare,
  Gift,
  CheckCircle,
  Star,
  Clipboard,
  Mail,
  LifeBuoy,
  Clock,
} from "lucide-react";

export default function DashboardLayout() {
  const { user, login, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
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
          } catch {
            // ignore
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
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redirect if not logged in
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

  const isProfileActive = () =>
    location.pathname === "/account" ||
    location.pathname === "/account/" ||
    location.pathname.startsWith("/account/profile");

  // ------------------- NEW: Additional UI state & helpers -------------------
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
  const referralCode = user?.referralCode ?? `DRP-${user?.id ?? "guest"}`;

  useEffect(() => {
    let mounted = true;
    async function loadRecent() {
      setRecentLoading(true);
      try {
        // attempt to fetch recent orders for preview; if API absent, no big deal
        const res = await fetchWithTimeout(`${ACCOUNT_BASE}/orders?limit=3`, { credentials: "include" }, 7000).catch(() => null);
        if (!res || !res.ok) {
          setRecentOrders([]);
          return;
        }
        const json = await res.json().catch(() => null);
        if (mounted && json) {
          const arr = Array.isArray(json) ? json : json.orders ?? json.data ?? [];
          setRecentOrders(Array.isArray(arr) ? arr : []);
        }
      } catch (err) {
        console.warn("Could not load recent orders", err);
        setRecentOrders([]);
      } finally {
        if (mounted) setRecentLoading(false);
      }
    }
    loadRecent();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      alert("Referral code copied to clipboard!");
    } catch {
      // fallback
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

  const goToOrders = () => navigate("/account/orders");
  const goToWishlist = () => navigate("/account/wishlist");
  const goToAddresses = () => navigate("/account/addresses");

  const openWhatsAppSupport = () => {
    const phone = "+919494038163";
    const text = encodeURIComponent("Hi Dripzoid Support — I need help with my order.");
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${text}`, "_blank");
  };

  // simple profile completeness heuristic
  const profileCompleteness = (() => {
    if (!user) return 0;
    const checks = [
      !!user.name,
      !!user.email,
      !!user.phone || !!user.mobile,
      Array.isArray(user.addresses) && user.addresses.length > 0,
      !!user.referralCode,
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    return score;
  })();

  // ------------------- RENDER -------------------
  return (
    // keep top padding to offset fixed navbar (navbar assumed h-16)
    <div className="pt-16 relative flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static top-16 lg:top-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col
          h-full transition-transform duration-200 transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:h-auto lg:flex-shrink-0`}
      >
        {/* Mobile Header inside sidebar */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4
                border-b border-gray-200 dark:border-gray-700
                lg:hidden"
        >
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Dashboard</h2>
          <button onClick={closeSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <XIcon size={20} />
          </button>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:block">
          <h2 className="text-2xl font-extrabold p-6 text-gray-900 dark:text-white">Dashboard</h2>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col flex-grow overflow-auto">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) => {
                const active = isActive || (to === "/account/profile" && isProfileActive());
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

        <div className="mt-auto p-4 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          <div>Logged in as</div>
          <div className="mt-1 font-medium text-gray-800 dark:text-gray-100">{user?.email ?? user?.name ?? "Account"}</div>
        </div>
      </aside>

      {/* OVERLAY for mobile sidebar */}
      {sidebarOpen && <div onClick={closeSidebar} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"></div>}

      {/* MAIN CONTENT */}
      <main
        className="relative flex-1 min-w-0 pt-4 sm:pt-0 p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-950 
                   rounded-tl-none lg:rounded-tl-3xl lg:rounded-bl-3xl
                   shadow-none lg:shadow-lg overflow-auto"
      >
        <div className="w-full">
          {/* Desktop Header */}
          {isDesktop ? (
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, {user?.name || "User"}!</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your account, orders, and preferences from here.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                  <Star size={16} /> <div className="text-sm font-medium">{user?.loyaltyPoints ?? 0} pts</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60 font-semibold text-sm flex items-center gap-2 transition"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </header>
          ) : (
            <header className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={openSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                  <MenuIcon size={20} />
                </button>
                <span className="text-lg font-semibold">Hi, {user?.name ? user.name.split(" ")[0] : "User"}</span>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-rose-600">
                <LogOut size={20} />
              </button>
            </header>
          )}

          {/* ---------------- NEW: Helpful dashboard sections ---------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left column: Quick actions & track */}
            <div className="space-y-4">
              {/* Announcement / Promo */}
              <div className="rounded-2xl p-4 border bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">Announcement</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Free shipping on prepaid orders above ₹999 — this week only!</p>
                  </div>
                  <Gift size={22} className="text-rose-500" />
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl p-4 border bg-white dark:bg-gray-900 shadow-sm">
                <h4 className="font-semibold mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button onClick={goToOrders} className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition">
                    <ShoppingBag size={16} /> Orders
                  </button>
                  <button onClick={goToWishlist} className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition">
                    <Heart size={16} /> Wishlist
                  </button>
                  <button onClick={goToAddresses} className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition">
                    <MapPin size={16} /> Addresses
                  </button>
                  <button onClick={() => navigate("/account/settings")} className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition">
                    <Settings size={16} /> Settings
                  </button>
                </div>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 block mb-2">Track Order</label>
                  <div className="flex gap-2">
                    <input value={trackInput} onChange={(e) => setTrackInput(e.target.value)} placeholder="Enter tracking ID" className="flex-1 px-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-800" />
                    <button
                      onClick={() => {
                        if (!trackInput) return alert("Enter a tracking ID to track.");
                        // if you have a tracking route:
                        navigate(`/track/${encodeURIComponent(trackInput)}`);
                      }}
                      className="px-3 py-2 rounded-md bg-black text-white"
                    >
                      Track
                    </button>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="rounded-2xl p-4 border bg-white dark:bg-gray-900 shadow-sm">
                <h4 className="font-semibold mb-2">Support & Feedback</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Need help? Our team is here for you.</p>
                <div className="flex gap-2">
                  <a href="mailto:support@dripzoid.com" className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200">
                    <Mail size={16} /> Email
                  </a>
                  <button onClick={openWhatsAppSupport} className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:brightness-95">
                    <MessageSquare size={16} /> WhatsApp
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                  <LifeBuoy size={14} /> <span>For returns & claims, check <button onClick={() => navigate("/shipping")} className="underline">Shipping Policy</button></span>
                </div>
              </div>
            </div>

            {/* Middle column: Account summary */}
            <div className="rounded-2xl p-6 border bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Account Summary</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">A snapshot of your profile and rewards.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Loyalty</div>
                    <div className="text-xl font-bold">{user?.loyaltyPoints ?? 0} pts</div>
                  </div>
                  <CheckCircle size={34} className="text-emerald-500" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div>Profile completeness</div>
                  <div>{profileCompleteness}%</div>
                </div>
                <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div style={{ width: `${profileCompleteness}%` }} className="h-full bg-gradient-to-r from-rose-500 to-amber-400" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs text-gray-500">Verified</div>
                    <div className="mt-1 font-medium">{user?.email ? "Email" : "—"}</div>
                  </div>
                  <div className="p-3 rounded-md bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs text-gray-500">Addresses</div>
                    <div className="mt-1 font-medium">{Array.isArray(user?.addresses) ? user.addresses.length : 0}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button onClick={() => navigate("/account/profile")} className="px-3 py-2 rounded-md bg-black text-white">Edit Profile</button>
                  <button onClick={() => navigate("/account/orders")} className="px-3 py-2 rounded-md border">View Orders</button>
                </div>
              </div>
            </div>

            {/* Right column: recent orders & referral */}
            <div className="space-y-4">
              {/* Recent Orders */}
              <div className="rounded-2xl p-4 border bg-white dark:bg-gray-900 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Recent Orders</h4>
                  <button onClick={goToOrders} className="text-sm text-gray-500 hover:underline">View all</button>
                </div>

                {recentLoading ? (
                  <div className="text-sm text-gray-500">Loading...</div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-sm text-gray-500">No recent orders found.</div>
                ) : (
                  <ul className="space-y-2">
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

              {/* Referral / Rewards */}
              <div className="rounded-2xl p-4 border bg-gradient-to-tr from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-sm">
                <h4 className="font-semibold mb-1 flex items-center gap-2"><Gift size={16} /> Refer & Earn</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Share your code and earn rewards when friends make purchases.</p>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-md bg-white/60 dark:bg-gray-800 font-mono text-sm">{referralCode}</div>
                  <button onClick={copyReferral} className="px-3 py-2 rounded-md bg-black text-white">Copy</button>
                  <button onClick={() => navigator.share ? navigator.share({ title: "Join Dripzoid", text: `Use my code ${referralCode} at dripzoid.com`, url: window.location.origin }) : alert("Use copy to share")} className="px-3 py-2 rounded-md border">Share</button>
                </div>
              </div>

              {/* Newsletter toggle */}
              <div className="rounded-2xl p-4 border bg-white dark:bg-gray-900 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Newsletter</h4>
                    <p className="text-sm text-gray-500">Get updates on new drops and exclusive sales.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">{newsletterSubscribed ? "Subscribed" : "Subscribe"}</label>
                    <input type="checkbox" checked={newsletterSubscribed} onChange={toggleNewsletter} className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
