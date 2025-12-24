// src/components/Navbar.jsx
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
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Theme handling
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Responsive handling
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () =>
    setTheme((t) => (t === "light" ? "dark" : "light"));

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.email?.split?.("@")?.[0] ||
    "";

  const navLinks = [
    { name: "Men", path: "/men" },
    { name: "Women", path: "/women" },
    { name: "Kids", path: "/kids" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* NAVBAR ROW */}
        <div className="flex items-center justify-between h-[96px]">
          
          {/* LEFT — LOGO */}
          <Link
            to="/"
            onClick={() => setMobileMenu(false)}
            className="flex items-center h-full flex-shrink-0"
          >
            <img
              src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"}
              alt="Dripzoid"
              className="h-full max-h-[72px] w-auto object-contain"
            />
          </Link>

          {/* CENTER — NAV LINKS (DESKTOP) */}
          {isDesktop && (
            <div className="flex items-center space-x-10">
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
          )}

          {/* RIGHT — ACTIONS */}
          <div className="flex items-center gap-4">
            {isDesktop && (
              <div className="w-52">
                <GlobalSearchBar />
              </div>
            )}

            <Link to="/account/wishlist" className="relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link to="/cart" className="relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Link>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {user ? (
              <Link to="/account" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <User size={18} />
                <span className="hidden sm:inline text-sm">{displayName}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 text-sm font-medium rounded-full ring-2 ring-black dark:ring-white"
              >
                Login
              </Link>
            )}

            {/* MOBILE MENU BUTTON */}
            {!isDesktop && (
              <button
                onClick={() => setMobileMenu((m) => !m)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* ✅ MOBILE DROPDOWN MENU */}
        {!isDesktop && mobileMenu && (
          <div className="pb-4 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenu(false)}
                  className="px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
                >
                  {link.name}
                </Link>
              ))}

              <div className="px-2 pt-2">
                <GlobalSearchBar />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
