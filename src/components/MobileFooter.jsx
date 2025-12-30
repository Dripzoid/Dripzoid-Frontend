// src/components/MobileFooter.jsx
import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../contexts/UserContext.js";
import { Home, Heart, ShoppingCart, User } from "lucide-react";

/**
 * MobileFooter
 * - Mobile-only (hidden on md+)
 * - Icons only: Home, Wishlist, Cart, User
 * - Fixed to bottom with safe-area handling
 * - Stateless navigation (uses links + conditional redirect for user icon)
 */
export default function MobileFooter() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const handleUserClick = () => {
    if (user) navigate("/profile");
    else navigate("/login");
  };

  return (
    <footer
      aria-label="Mobile primary navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black text-white border-t border-gray-800"
      style={{
        // ensure it respects iPhone safe area and provide fallback spacing
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Home */}
          <Link
            to="/"
            className="flex-1 flex flex-col items-center justify-center p-2"
            aria-label="Home"
          >
            <Home size={22} />
          </Link>

          {/* Wishlist */}
          <Link
            to="/wishlist"
            className="flex-1 flex flex-col items-center justify-center p-2"
            aria-label="Wishlist"
          >
            <Heart size={22} />
          </Link>

          {/* Cart */}
          <Link
            to="/cart"
            className="flex-1 flex flex-col items-center justify-center p-2"
            aria-label="Cart"
          >
            <ShoppingCart size={22} />
          </Link>

          {/* User (conditional redirect on click) */}
          <button
            type="button"
            onClick={handleUserClick}
            className="flex-1 flex flex-col items-center justify-center p-2"
            aria-label={user ? "Profile" : "Login"}
          >
            <User size={22} />
          </button>
        </div>
      </div>
    </footer>
  );
}
