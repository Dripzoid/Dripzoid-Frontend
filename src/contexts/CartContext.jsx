// src/contexts/CartContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import { UserContext } from "./UserContext.js";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user, token } = useContext(UserContext);
  const [cart, setCart] = useState([]);
  const [buyNowItem, setBuyNowItem] = useState(null); // for Buy Now
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE;

  const normalizeRow = (row = {}) => {
    const cart_id = row.cart_id ?? row.id ?? row.cartId ?? null;
    const product_id =
      row.product_id ?? row.productId ?? row.product_id ?? null;

    const quantity = Number(row.quantity ?? row.qty ?? 1);
    const selectedSize =
      row.selectedSize ?? row.size ?? row.variant_size ?? null;
    const selectedColor =
      row.selectedColor ?? row.color ?? row.colors ?? row.variant_color ?? null;
    const variantId = row.variantId ?? row.variant_id ?? null;

    const productName = row.name ?? row.product_name ?? row.title ?? "";
    const productPrice = Number(row.price ?? row.unit_price ?? 0);
    const productImages = row.images ?? row.product_images ?? [];
    const productStock = row.stock ?? null;

    const product = {
      id: product_id,
      name: productName,
      price: productPrice,
      images: productImages,
      stock: productStock,
    };

    return {
      cart_id,
      id: cart_id,
      product_id,
      product,
      quantity,
      selectedSize,
      selectedColor,
      variantId,

      name: productName,
      price: productPrice,
      images: productImages,
      stock: productStock,
      raw: row,
    };
  };

  const fetchCart = async () => {
    if (!user || !token) {
      setCart([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Fetch failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.warn(
          "Cart fetch: unexpected response shape, expected array:",
          data
        );
        setCart([]);
        return;
      }
      const normalized = data.map(normalizeRow);
      setCart(normalized);
    } catch (err) {
      console.error("Error fetching cart:", err);
      setError("Could not load cart");
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add to cart
   * Supports two signatures:
   *   1. addToCart(itemForCartObject)
   *   2. addToCart(product, quantity, size, color, variantInfo)
   */
  const addToCart = async (...args) => {
    if (!user || !token) {
      alert("Please log in to add items to cart");
      throw new Error("Not authenticated");
    }

    let payload = {};

    if (args.length === 1 && typeof args[0] === "object") {
      // ✅ New API: object payload
      const item = args[0];
      payload = {
        product_id: item.product_id ?? item.product?.id ?? null,
        quantity: Number(item.quantity ?? 1),
        selectedSize: item.selectedSize ?? null,
        selectedColor: item.selectedColor ?? null,
        variantId: item.variantId ?? null,
        price: item.price ?? null,
        images: item.images ?? [],
      };
    } else {
      // ✅ Legacy API
      const [product, quantity = 1, size = null, color = null, variantInfo = {}] =
        args;
      payload = {
        product_id: product?.id ?? product?._id ?? null,
        quantity: Number(quantity ?? 1),
        selectedSize: size,
        selectedColor: color,
        variantId: variantInfo?.variantId ?? null,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Add failed: ${res.status} ${txt}`);
      }
      await fetchCart();
      return true;
    } catch (err) {
      console.error("Error adding to cart:", err);
      setError("Could not add to cart");
      throw err;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/cart/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Update failed: ${res.status} ${txt}`);
      }
      await fetchCart();
    } catch (err) {
      console.error("Error updating quantity:", err);
      setError("Could not update quantity");
    }
  };

  const removeFromCart = async (itemId) => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${API_BASE}/api/cart/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Delete failed: ${res.status} ${txt}`);
      }
      await fetchCart();
    } catch (err) {
      console.error("Error removing from cart:", err);
      setError("Could not remove item");
    }
  };

  const buyNow = (product, quantity = 1, size = null, color = null, variantInfo = {}) => {
    setBuyNowItem({
      product,
      quantity,
      selectedSize: size,
      selectedColor: color,
      variantId: variantInfo?.variantId ?? null,
    });
  };

  useEffect(() => {
    fetchCart();
  }, [user, token]);

  return (
    <CartContext.Provider
      value={{
        cart,
        buyNowItem,
        loading,
        error,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        buyNow,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
