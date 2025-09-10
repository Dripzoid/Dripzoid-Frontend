import React from "react";
import { useCart } from "../contexts/CartContext";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const total = cart.reduce(
    (sum, item) =>
      sum + (Number(item.product?.price || item.price || 0) * item.quantity),
    0
  );

  const handleCheckout = () => {
    const itemsData = cart.map((item) => ({
      id: item.product?.id || item.id,
      name: item.product?.name || item.name,
      price: Number(item.product?.price || item.price) || 0,
      quantity: item.quantity,
      color : item.selectedColor || null,
      size: item.selectedSize || null,
      image: (item.product?.images || item.images || "").split(",")[0].trim(),
    }));

    const totalAmount = itemsData.reduce(
      (sum, it) => sum + it.price * it.quantity,
      0
    );

    navigate("/checkout", {
      state: {
        mode: "cart",
        items: itemsData,
        total: totalAmount,
      },
    });
  };

  const handleNavigate = (id) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <ShoppingBag className="w-7 h-7" /> Shopping Cart
      </h1>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Your cart is empty
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {cart.map((item) => {
              const price = Number(item.product?.price || item.price || 0);
              const name = item.product?.name || item.name;
              const productId = item.product?.id || item.id;

              // Pick first image if multiple URLs
              const image = (item.product?.images || item.images || "")
                .split(",")[0]
                .trim();

              return (
                <motion.div
                  key={item.id}
                  layout
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-6 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 cursor-pointer"
                  onClick={() => handleNavigate(productId)}
                >
                  <img
                    src={image}
                    alt={name}
                    className="w-28 h-28 object-cover rounded-xl"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                      {name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ₹{price.toLocaleString()}
                    </p>

                    {/* Color & Size */}
                    <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {item.color && (
                        <p>
                          <span className="font-medium">Color:</span>{" "}
                          {item.color}
                        </p>
                      )}
                      {item.size && (
                        <p>
                          <span className="font-medium">Size:</span> {item.size}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, Math.max(1, item.quantity - 1));
                        }}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-3 min-w-[28px] text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity + 1);
                        }}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      ₹{(price * item.quantity).toLocaleString()}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.id);
                      }}
                      className="text-red-500 hover:text-red-600 mt-3"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-between items-center gap-6">
            <span className="text-2xl font-bold">
              Total: ₹{total.toLocaleString()}
            </span>

            <motion.button
              onClick={handleCheckout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cssbuttons-io shadow-neon-black px-8 py-4 rounded-full flex items-center justify-center gap-3 text-lg"
            >
              Proceed to Checkout
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
