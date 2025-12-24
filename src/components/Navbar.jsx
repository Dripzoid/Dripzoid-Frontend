import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import {
  Heart,
  ShoppingCart,
  Sun,
  Moon,
  User,
  Menu,
  X,
} from "lucide-react";
import GlobalSearchBar from "./GlobalSearch.jsx";

export default function Navbar() {
  const { user } = useContext(UserContext);
  const { cart = [] } = useCart();
  const { wishlist = [] } = useWishlist();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const [mobileMenu, setMobileMenu] = useState(false);

  // Theme handling (SAFE)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          {/* NAVBAR ROW — HEIGHT LOCKED */}
          <div className="flex items-center justify-between h-[96px]">

            {/* LOGO — FRAME CONTROLS SIZE (KEY FIX) */}
            <Link to="/" className="flex items-center h-full flex-shrink-0">
              <div className="h-[86px] w-auto overflow-hidden flex items-center">
                <img
                  src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                  alt="Dripzoid"
                  className="h-full w-auto object-cover block"
                />
              </div>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden md:flex items-center space-x-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-3">
              {/* Desktop search */}
              <div className="hidden md:block w-52">
                <GlobalSearchBar />
              </div>

              {/* Wishlist */}
              <Link
                to="/account/wishlist"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Heart size={20} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Link>

              {/* Theme toggle */}
              <button
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {/* Login / User — ALWAYS IN NAVBAR */}
              {user ? (
                <Link
                  to="/account"
                  className="hidden sm:flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <User size={18} />
                  <span className="text-sm">{user.name || "Account"}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                >
                  Login
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button
                onClick={() => setMobileMenu((m) => !m)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenu ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DROPDOWN ================= */}
      {mobileMenu && (
        <div className="md:hidden fixed top-[96px] left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-lg">
          <div className="flex flex-col p-5 space-y-5 text-gray-800 dark:text-gray-200">

            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenu(false)}
                className="text-lg font-medium"
              >
                {link.name}
              </Link>
            ))}

            <GlobalSearchBar />

            <Link
              to="/account/wishlist"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2"
            >
              <Heart size={18} /> Wishlist ({wishlist.length})
            </Link>

            <Link
              to="/cart"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2"
            >
              <ShoppingCart size={18} /> Cart ({cart.length})
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { useCart } from "../contexts/CartContext.jsx";
import { useWishlist } from "../contexts/WishlistContext.jsx";
import {
  Heart,
  ShoppingCart,
  Sun,
  Moon,
  User,
  Menu,
  X,
} from "lucide-react";
import GlobalSearchBar from "./GlobalSearch.jsx";

export default function Navbar() {
  const { user } = useContext(UserContext);
  const { cart = [] } = useCart();
  const { wishlist = [] } = useWishlist();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light"
  );
  const [mobileMenu, setMobileMenu] = useState(false);

  // Theme handling (SAFE)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          {/* NAVBAR ROW — HEIGHT LOCKED */}
          <div className="flex items-center justify-between h-[96px]">

            {/* LOGO — FRAME CONTROLS SIZE (KEY FIX) */}
            <Link to="/" className="flex items-center h-full flex-shrink-0">
              <div className="h-[86px] w-auto overflow-hidden flex items-center">
                <img
                  src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
                  alt="Dripzoid"
                  className="h-full w-auto object-cover block"
                />
              </div>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden md:flex items-center space-x-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-3">
              {/* Desktop search */}
              <div className="hidden md:block w-52">
                <GlobalSearchBar />
              </div>

              {/* Wishlist */}
              <Link
                to="/account/wishlist"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Heart size={20} />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Link>

              {/* Theme toggle */}
              <button
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {/* Login / User — ALWAYS IN NAVBAR */}
              {user ? (
                <Link
                  to="/account"
                  className="hidden sm:flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <User size={18} />
                  <span className="text-sm">{user.name || "Account"}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-flex px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
                >
                  Login
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button
                onClick={() => setMobileMenu((m) => !m)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenu ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ================= MOBILE DROPDOWN ================= */}
      {mobileMenu && (
        <div className="md:hidden fixed top-[96px] left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t shadow-lg">
          <div className="flex flex-col p-5 space-y-5 text-gray-800 dark:text-gray-200">

            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenu(false)}
                className="text-lg font-medium"
              >
                {link.name}
              </Link>
            ))}

            <GlobalSearchBar />

            <Link
              to="/account/wishlist"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2"
            >
              <Heart size={18} /> Wishlist ({wishlist.length})
            </Link>

            <Link
              to="/cart"
              onClick={() => setMobileMenu(false)}
              className="flex items-center gap-2"
            >
              <ShoppingCart size={18} /> Cart ({cart.length})
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
