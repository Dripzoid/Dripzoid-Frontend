import React, {
  useContext,
  useState,
  useEffect,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  UserContext,
} from "../contexts/UserContext.js";

import {
  useCart,
} from "../contexts/CartContext.jsx";

import {
  useWishlist,
} from "../contexts/WishlistContext.jsx";

import {
  Heart,
  ShoppingCart,
  Sun,
  Moon,
  User,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import GlobalSearchBar from "./GlobalSearch.jsx";

const API_BASE = (
  process.env.REACT_APP_API_BASE || ""
).replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${API_BASE}${path}`;
}

export default function Navbar() {
  const navigate =
    useNavigate();

  /* ======================================================
     USER CONTEXT
  ====================================================== */

  const {
    user,
    loading,
    logout,
  } = useContext(
    UserContext
  );

  /* ======================================================
     CART + WISHLIST
  ====================================================== */

  const {
    cart = [],
  } = useCart();

  const {
    items: wishlist = [],
  } = useWishlist();

  /* ======================================================
     THEME
  ====================================================== */

  const [theme, setTheme] =
    useState(
      () =>
        localStorage.getItem(
          "theme"
        ) || "light"
    );

  /* ======================================================
     RESPONSIVE
  ====================================================== */

  const [
    mobileMenu,
    setMobileMenu,
  ] = useState(false);

  const [
    isDesktop,
    setIsDesktop,
  ] = useState(
    window.innerWidth >= 768
  );

  /* ======================================================
     APPLY THEME
  ====================================================== */

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    localStorage.setItem(
      "theme",
      theme
    );
  }, [theme]);

  /* ======================================================
     RESPONSIVE HANDLER
  ====================================================== */

  useEffect(() => {
    const onResize = () => {
      const desktop =
        window.innerWidth >=
        768;

      setIsDesktop(desktop);

      if (desktop) {
        setMobileMenu(false);
      }
    };

    window.addEventListener(
      "resize",
      onResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        onResize
      );
  }, []);

  /* ======================================================
     NAV LINKS
  ====================================================== */

  const navLinks = [
    {
      name: "Men",
      path: "/men",
    },

    {
      name: "Women",
      path: "/women",
    },

    {
      name: "Kids",
      path: "/kids",
    },
  ];

  /* ======================================================
     HANDLE LOGOUT
  ====================================================== */

  const handleLogout =
    async () => {
      try {
        await logout();

        navigate("/login", {
          replace: true,
        });
      } catch (err) {
        console.error(
          "Logout Error:",
          err
        );
      }
    };

  /* ======================================================
     GOOGLE HYDRATION FIX
  ====================================================== */

  if (loading) {
    return null;
  }

  return (
    <>
      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-[96px]">

            {/* ======================================================
                LOGO
            ====================================================== */}

            <Link
              to="/"
              className="flex items-center h-full"
            >
              <img
                src={
                  theme === "light"
                    ? "/logo-light.png"
                    : "/logo-dark.png"
                }
                alt="Dripzoid"
                className="h-[85%] w-auto object-contain"
              />
            </Link>

            {/* ======================================================
                DESKTOP NAV
            ====================================================== */}

            {isDesktop && (
              <div className="flex items-center space-x-10">
                {navLinks.map(
                  (link) => (
                    <Link
                      key={
                        link.name
                      }
                      to={
                        link.path
                      }
                      className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition"
                    >
                      {link.name}
                    </Link>
                  )
                )}
              </div>
            )}

            {/* ======================================================
                RIGHT ACTIONS
            ====================================================== */}

            <div className="flex items-center gap-3">

              {/* SEARCH */}

              <GlobalSearchBar />

              {/* THEME */}

              <button
                onClick={() =>
                  setTheme(
                    (t) =>
                      t ===
                      "light"
                        ? "dark"
                        : "light"
                  )
                }
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {theme ===
                "light" ? (
                  <Moon size={20} />
                ) : (
                  <Sun size={20} />
                )}
              </button>

              {/* ======================================================
                  AUTH
              ====================================================== */}

              {isDesktop ? (
                user ? (
                  <div className="flex items-center gap-2">

                    {/* WISHLIST */}

                    <Link
                      to="/account/wishlist"
                      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <Heart size={20} />

                      {wishlist.length >
                        0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                          {
                            wishlist.length
                          }
                        </span>
                      )}
                    </Link>

                    {/* CART */}

                    <Link
                      to="/cart"
                      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <ShoppingCart size={20} />

                      {cart.length >
                        0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                          {
                            cart.length
                          }
                        </span>
                      )}
                    </Link>

                    {/* ACCOUNT */}

                    <Link
                      to="/account"
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <User size={22} />
                    </Link>

                    {/* LOGOUT */}

                    <button
                      onClick={
                        handleLogout
                      }
                      className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
                    >
                      <LogOut
                        size={20}
                      />
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition"
                  >
                    Login
                  </Link>
                )
              ) : user ? (
                <button
                  onClick={() =>
                    setMobileMenu(
                      (m) => !m
                    )
                  }
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {mobileMenu ? (
                    <X size={26} />
                  ) : (
                    <Menu size={26} />
                  )}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ======================================================
          MOBILE MENU
      ====================================================== */}

      {!isDesktop &&
        mobileMenu &&
        user && (
          <div className="fixed top-[96px] left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-lg">
            <div className="flex flex-col p-5 space-y-5">

              {navLinks.map(
                (link) => (
                  <Link
                    key={
                      link.name
                    }
                    to={
                      link.path
                    }
                    onClick={() =>
                      setMobileMenu(
                        false
                      )
                    }
                    className="text-lg font-medium text-gray-800 dark:text-gray-200"
                  >
                    {link.name}
                  </Link>
                )
              )}

              <Link
                to="/account"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="text-lg font-medium text-gray-800 dark:text-gray-200"
              >
                Account
              </Link>

              <Link
                to="/account/wishlist"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="text-lg font-medium text-gray-800 dark:text-gray-200"
              >
                Wishlist (
                {
                  wishlist.length
                }
                )
              </Link>

              <Link
                to="/cart"
                onClick={() =>
                  setMobileMenu(
                    false
                  )
                }
                className="text-lg font-medium text-gray-800 dark:text-gray-200"
              >
                Cart (
                {cart.length})
              </Link>

              <button
                onClick={
                  handleLogout
                }
                className="text-left text-lg font-medium text-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        )}
    </>
  );
}
