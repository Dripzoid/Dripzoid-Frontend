// src/pages/CheckoutPage.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import { useCart } from "../contexts/CartContext";
import { Check, CreditCard, ArrowLeft, ArrowRight, ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../contexts/UserContext";

/**
 * Advanced Checkout Page
 * - Accepts items via location.state.items (buy-now or cart passed through navigation)
 * - Falls back to CartContext cart if no items passed
 * - 3-step process (Review, Shipping, Payment)
 *
 * Integrated with:
 *  - GET /api/addresses
 *  - POST /api/addresses (save)
 *  - DELETE /api/addresses/:id
 *  - GET /api/payments
 *  - (uses selected payment id in payload when available)
 */

const API_BASE = process.env.REACT_APP_API_BASE;

export default function CheckoutPage() {
  const { cart = [], fetchCart } = useCart();
  const { user, token } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);

  const emptyShipping = {
    name: "",
    address: "",
    phone: "",
    pincode: "",
    state: "",
    country: "",
  };
  const [shipping, setShipping] = useState(emptyShipping);
  const [saveAddress, setSaveAddress] = useState(false);

  // Saved addresses (from backend if logged in; fallback to localStorage)
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Payment states (manual)
  const [paymentType, setPaymentType] = useState("");
  const [upiApp, setUpiApp] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [bankUsername, setBankUsername] = useState("");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });

  // Saved payments from backend
  const [savedPayments, setSavedPayments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null); // use this if user picks a saved payment

  const [loading, setLoading] = useState(false);

  const upiApps = [
    { name: "Google Pay", id: "gpay", icon: "https://raw.githubusercontent.com/razorpay/razorpay-logos/master/payments/gpay.png" },
    { name: "PhonePe", id: "phonepe", icon: "https://raw.githubusercontent.com/razorpay/razorpay-logos/master/payments/phonepe.png" },
    { name: "Paytm", id: "paytm", icon: "https://raw.githubusercontent.com/razorpay/razorpay-logos/master/payments/paytm.png" },
    { name: "BHIM", id: "bhim", icon: "https://raw.githubusercontent.com/razorpay/razorpay-logos/master/payments/bhim.png" },
  ];

  // --- Load saved addresses (backend or localStorage) and saved payments ---
  useEffect(() => {
    // load local fallback addresses first
    try {
      const raw = localStorage.getItem("savedAddresses");
      if (raw) setSavedAddresses(JSON.parse(raw));
    } catch (e) {
      // ignore
    }

    // if logged in, fetch from backend and override local
    if (!token) return;

    const fetchSaved = async () => {
      try {
        // addresses
        const aRes = await fetch(`${API_BASE}/api/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (aRes.ok) {
          const addresses = await aRes.json();
          if (Array.isArray(addresses)) {
            // Map server shape -> UI-friendly shape (keep both shapes supported)
            const mapped = addresses.map((a) => ({
              ...a,
              // compatibility keys used in code: name and address
              name: a.label || a.name || `${a.line1 || ""}${a.line2 ? ", " + a.line2 : ""}`,
              address: a.line1 ? `${a.line1}${a.line2 ? ", " + a.line2 : ""}` : a.address || "",
            }));
            setSavedAddresses(mapped);

            // auto-fill default address if present
            const def = mapped.find((x) => x.is_default);
            if (def) {
              setShipping({
                name: def.label || def.name || "",
                address: def.line1 ? `${def.line1}${def.line2 ? ", " + def.line2 : ""}` : def.address || "",
                phone: def.phone || "",
                pincode: def.pincode || "",
                state: def.state || "",
                country: def.country || "India",
              });
            }
          }
        }

        // payments
        const pRes = await fetch(`${API_BASE}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pRes.ok) {
          const payments = await pRes.json();
          if (Array.isArray(payments)) {
            setSavedPayments(payments);
            const defPay = payments.find((p) => p.is_default);
            if (defPay) {
              setSelectedPaymentId(defPay.id);
              setPaymentType(defPay.type);
              // populate display-only fields (masked)
              if (defPay.type === "card") {
                setCard({
                  number: defPay.masked_number || "",
                  name: defPay.card_name || defPay.holder_name || "",
                  expiry: defPay.card_expiry || "",
                  cvv: "",
                });
              } else if (defPay.type === "upi") {
                setUpiId(defPay.masked_number || "");
              } else if (defPay.type === "netbanking") {
                setSelectedBank(defPay.bank_name || "");
                setBankUsername(defPay.holder_name || "");
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch saved addresses/payments:", e);
      }
    };

    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * NORMALIZATION FIX:
   * - Accept incoming either from location.state.items or cart
   * - Ensure each normalized item contains:
   *    - cart_id (cart row id if available)
   *    - product_id (real products.id)
   *    - id (stable unique id for list rendering)
   *    - name, price, quantity, images, original
   */
  const checkoutItems = useMemo(() => {
    const incoming = Array.isArray(location.state?.items) ? location.state.items : cart;

    return (Array.isArray(incoming) ? incoming : []).map((it, idx) => {
      // If API provided a nested product snapshot use it; else treat it as product-like already
      const prod = it.product ?? it;

      // cart row id - some backends return cart_id or id
      const cartRowId = it.cart_id ?? it.id ?? null;

      // real product id can be in it.product_id (cart API) or prod.id (product snapshot)
      const productId = it.product_id ?? prod.id ?? null;

      // stable unique id for React list keys - prefer productId then cartRowId then fallback
      const uniqueId = productId ? `p-${productId}` : cartRowId ? `c-${cartRowId}` : `itm-${idx}`;

      const name = prod.name ?? it.name ?? "Unnamed";
      const price = Number(prod.price ?? it.price ?? 0);
      const quantity = Number(it.quantity ?? it.qty ?? 1);
      const images = Array.isArray(prod.images) ? prod.images.join(",") : prod.images ?? it.images ?? it.image ?? "";

      return {
        cart_id: cartRowId,
        product_id: productId,
        id: uniqueId,
        name,
        price,
        quantity,
        images,
        original: prod,
      };
    });
  }, [location.state, cart]);

  const fmt = (n) =>
    typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n;

  const itemsTotal = checkoutItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const shippingCost = 0;
  const codCharge = paymentType === "cod" ? 25 : 0;
  const discount = promoApplied?.amount ?? 0;
  const grandTotal = Math.max(0, itemsTotal + shippingCost + codCharge - discount);

  const isShippingValid = () =>
    shipping.name.trim() && shipping.address.trim() && shipping.phone.trim() && shipping.pincode.trim();

  // Accept saved payment selection OR manual entry
  const isPaymentValid = () => {
    if (selectedPaymentId) return true; // using a saved payment
    if (paymentType === "upi") return upiApp && upiId.trim();
    if (paymentType === "netbanking") return selectedBank && bankUsername.trim();
    if (paymentType === "card")
      return (
        card.number.replace(/\s/g, "").length >= 12 &&
        card.name.trim().length > 1 &&
        card.expiry.trim() &&
        card.cvv.trim().length >= 3
      );
    if (paymentType === "cod") return true;
    return false;
  };

  const applyPromo = () => {
    if (!promoCode) return alert("Enter a promo code (demo)");
    if (promoCode.toUpperCase() === "SAVE50") {
      setPromoApplied({ code: "SAVE50", amount: 50 });
      alert("Promo applied: ₹50 off (demo)");
    } else {
      setPromoApplied(null);
      alert("Invalid/expired promo (demo)");
    }
  };

  // Save address: use backend if logged in; otherwise localStorage fallback
  const handleSaveAddress = async () => {
    if (!isShippingValid()) {
      alert("Please fill required shipping fields before saving.");
      return;
    }

    if (!token) {
      // local fallback
      try {
        const next = [...savedAddresses, { ...shipping, id: Date.now() }];
        localStorage.setItem("savedAddresses", JSON.stringify(next));
        setSavedAddresses(next);
        setSaveAddress(false);
        alert("Address saved locally (demo).");
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // For server save, ensure minimal required fields for backend: line1, city, state, pincode
    // We'll map shipping.address -> line1, use shipping.state as city fallback if city not present.
    const payload = {
      label: shipping.name || "",
      line1: shipping.address || "",
      line2: "",
      city: shipping.state || shipping.address || "City",
      state: shipping.state || "",
      pincode: shipping.pincode || "",
      country: shipping.country || "India",
      phone: shipping.phone || "",
      is_default: false,
    };

    if (!payload.line1 || !payload.city || !payload.state || !payload.pincode) {
      alert("To save to your account please ensure Address, State and Pincode are filled.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newAddr = await res.json();
        // keep UI compatible: compute name/address keys
        const mapped = {
          ...newAddr,
          name: newAddr.label || `${newAddr.line1}${newAddr.line2 ? ", " + newAddr.line2 : ""}`,
          address: newAddr.line1 ? `${newAddr.line1}${newAddr.line2 ? ", " + newAddr.line2 : ""}` : newAddr.address || "",
        };
        setSavedAddresses((s) => [mapped, ...s]);
        setSaveAddress(false);
        alert("Address saved to your account.");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || err?.error || `Failed to save address (status ${res.status})`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save address.");
    }
  };

  // Delete saved address (backend if token else localStorage)
  const handleDeleteAddress = async (addrId) => {
    if (!token) {
      const rest = savedAddresses.filter((s) => s.id !== addrId);
      localStorage.setItem("savedAddresses", JSON.stringify(rest));
      setSavedAddresses(rest);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/addresses/${addrId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const rest = savedAddresses.filter((s) => s.id !== addrId);
        setSavedAddresses(rest);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to delete address");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete address");
    }
  };

  // Select saved address mapping (server shape -> shipping fields)
  const handleSelectSavedAddress = (addr) => {
    // backend object has line1/line2/city/state/pincode/country/phone/label
    const mappedShipping = {
      name: addr.label ?? addr.name ?? "",
      address: addr.line1 ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}` : addr.address ?? "",
      phone: addr.phone ?? "",
      pincode: addr.pincode ?? "",
      state: addr.state ?? "",
      country: addr.country ?? "India",
    };
    setShipping(mappedShipping);
    // move to payment step to speed checkout
    setStep(3);
  };

  const goNext = () => {
    if (step === 2 && !isShippingValid()) {
      alert("Please provide Name, Address, Phone and Pincode.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  // detect buy-now mode robustly
  const isBuyNowMode = location.state?.mode === "buy-now" || location.state?.fromBuyNow === true;
  const fromCartDefault = typeof location.state?.fromCart === "boolean" ? location.state.fromCart : !isBuyNowMode;

  /**
   * HANDLE PAYMENT
   *
   * Behavior:
   * - when fromCart === true -> send cart-style payload (cart row ids or product_id)
   * - when fromCart === false (buy-now mode) -> send a buyNow payload with product snapshots
   *
   * This avoids sending undefined/NaN cart/product ids to backend which triggers "Cart item not found or not owned by user" errors.
   */
  const handlePayment = async ({ fromCart = fromCartDefault } = {}) => {
    if (!isPaymentValid()) {
      alert("Please complete the payment details (demo).");
      return;
    }

    if (!token) {
      alert("Please log in to place an order.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // If buyer explicitly chose buy-now (fromCart === false) use snapshots
      let orderPayload = null;

      // helper to build paymentDetails
      const buildPaymentDetails = () => {
        // If user selected a saved payment method, pass its id (safer)
        if (selectedPaymentId) return { savedPaymentId: selectedPaymentId };

        // otherwise manual entry
        if (paymentType === "upi") return { upiApp, upiId };
        if (paymentType === "netbanking") return { bank: selectedBank, username: bankUsername };
        if (paymentType === "card") return { card: { ...card } };
        return { cod: true };
      };

      if (!fromCart) {
        // Build buy-now items array (full snapshots). Backend should accept this shape for direct buy.
        const buyNowItems = checkoutItems.map((item) => ({
          // include snapshot and best-effort product_id (string or numeric)
          product_snapshot: item.original ?? null,
          product_id: item.product_id ?? item.original?.id ?? item.original?._id ?? null,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
        }));

        orderPayload = {
          buyNow: true,
          items: buyNowItems,
          totalAmount: grandTotal,
          paymentMethod: paymentType || (selectedPaymentId ? savedPayments.find(p => p.id === selectedPaymentId)?.type : undefined),
          shippingAddress: shipping,
          paymentDetails: buildPaymentDetails(),
        };
      } else {
        // Cart-based checkout: build cartItems payload carefully and filter out invalid entries
        const cartItemsPayload = checkoutItems
          .map((item) => {
            // prefer cart row id
            if (item.cart_id !== null && item.cart_id !== undefined) {
              const maybeNum = Number(item.cart_id);
              return { id: Number.isFinite(maybeNum) ? maybeNum : item.cart_id, quantity: Number(item.quantity || 1) };
            }

            // fallback to product id (try numeric, otherwise pass string)
            const pidCandidate = item.product_id ?? item.original?.id ?? item.original?._id ?? null;
            if (pidCandidate === null || pidCandidate === undefined) return null;

            const asNum = Number(pidCandidate);
            if (Number.isFinite(asNum)) return { product_id: asNum, quantity: Number(item.quantity || 1) };
            // non-numeric ids are passed as string
            return { product_id: String(pidCandidate), quantity: Number(item.quantity || 1) };
          })
          .filter(Boolean);

        orderPayload = {
          cartItems: cartItemsPayload,
          totalAmount: grandTotal,
          paymentMethod: paymentType || (selectedPaymentId ? savedPayments.find(p => p.id === selectedPaymentId)?.type : undefined),
          shippingAddress: shipping,
          paymentDetails: buildPaymentDetails(),
        };
      }

      // POST to backend endpoint
      const res = await fetch(`${process.env.REACT_APP_API_BASE}/api/orders/place-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }

      if (res.ok) {
        const order = {
          orderId: data?.orderId ?? data?.order?.id ?? null,
          items: checkoutItems,
          total: grandTotal,
          paymentMethod: paymentType,
          customerName: shipping.name || user?.name || "Guest",
          shipping,
          orderDate: new Date().toISOString(),
        };

        try {
          localStorage.setItem("lastOrder", JSON.stringify(order));
          // if this was a cart-based checkout, refresh the cart context
          if (fromCart && typeof fetchCart === "function") {
            await fetchCart();
          }
        } catch (e) {
          console.warn("Local storage save failed", e);
        }

        navigate("/order-confirmation", { state: { order } });
      } else {
        const message = (data && (data.error || data.message)) || `Failed to place order (status ${res.status})`;
        alert(message);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while placing the order.");
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };
  const formatExpiry = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + "/" + digits.slice(2);
  };

  useEffect(() => {
    // optional redirect or fetchCart refresh logic
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-gray-900 dark:text-gray-100">
      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-6">
        {["Review", "Shipping", "Payment"].map((label, idx) => {
          const i = idx + 1;
          const active = step === i;
          const done = step > i;
          return (
            <div key={label} className="flex-1">
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition ${done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400 bg-white dark:bg-gray-900"
                    }`}
                  aria-hidden
                >
                  {done ? <Check size={16} /> : i}
                </div>
                <div className="text-sm">
                  <div className={`font-medium ${active ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
                    {label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Review */}
          {step === 1 && (
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3">
                {checkoutItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <ShoppingCart className="mx-auto mb-3" />
                    <div>Your cart is empty</div>
                  </div>
                ) : (
                  checkoutItems.map((it) => {
                    return (
                      <div key={it.id} className="flex items-start gap-4">
                        <img
                          src={it.images?.split?.(",")?.[0] ?? "/placeholder.jpg"}
                          alt={it.name}
                          className="w-20 h-20 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{it.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{it.original?.category ?? ""}</div>
                              <div className="mt-2 text-sm font-semibold">₹{fmt(it.price)}</div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">Qty {it.quantity}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Items total</span>
                  <span>₹{fmt(itemsTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? "Free" : `₹${fmt(shippingCost)}`}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Promo ({promoApplied.code})</span>
                    <span>-₹{fmt(promoApplied.amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Order Total</span>
                  <span>₹{fmt(itemsTotal + shippingCost - (promoApplied?.amount ?? 0))}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    aria-label="Promo code"
                    placeholder="Promo code (demo)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 border px-3 py-2 rounded dark:bg-gray-800"
                  />
                  <button onClick={applyPromo} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition">
                    Apply
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Shipping Details</h3>
                <div className="text-sm text-gray-500">Saved addresses</div>
              </div>

              {/* Saved Addresses - modern black/white cards but same location in UI */}
              {savedAddresses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="border rounded-2xl p-4 bg-white dark:bg-black text-gray-900 dark:text-gray-100 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-semibold">{addr.label || addr.name || (addr.name && addr.name.trim()) || "Address"}</div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            {addr.line1 ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}` : addr.address}
                          </div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            {addr.city ? `${addr.city}, ${addr.state}` : addr.state} • {addr.pincode ?? ""}
                          </div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{addr.phone}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {addr.is_default && <div className="text-xs font-medium text-green-600 dark:text-green-400">Default</div>}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSelectSavedAddress(addr)}
                              className="text-sm px-3 py-1 rounded border bg-black text-white dark:bg-white dark:text-black"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-sm px-3 py-1 rounded border text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {Object.keys(shipping).map((field) => (
                  <input
                    key={field}
                    aria-label={field}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={shipping[field]}
                    onChange={(e) => setShipping({ ...shipping, [field]: e.target.value })}
                    className="border rounded px-3 py-2 dark:bg-gray-800"
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Save this address for future</span>
                </label>

                {saveAddress && (
                  <button onClick={handleSaveAddress} className="ml-2 px-3 py-1 rounded border bg-black text-white dark:bg-white dark:text-black">Save</button>
                )}
              </div>
            </section>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Payment</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ id: "upi", label: "UPI" }, { id: "netbanking", label: "Net Banking" }, { id: "card", label: "Credit / Debit Card" }, { id: "cod", label: "Cash on Delivery" }].map((m) => (
                  <button key={m.id} onClick={() => { setPaymentType(m.id); if (m.id !== "upi") setUpiApp(""); setSelectedPaymentId(null); }} className={`flex items-center justify-center gap-2 border rounded p-3 text-sm font-medium transition ${paymentType === m.id ? "bg-black text-white dark:bg-white dark:text-black shadow" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`} aria-pressed={paymentType === m.id}>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Saved Payments - black/white cards */}
              {savedPayments.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Saved payment methods</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedPayments.map((pm) => {
                      const selected = selectedPaymentId === pm.id;
                      return (
                        <div
                          key={pm.id}
                          className={`p-4 rounded-2xl border ${selected ? "ring-2 ring-offset-2 ring-black dark:ring-white" : ""} bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex items-center justify-between`}
                        >
                          <div>
                            <div className="text-sm font-semibold">{pm.nickname || (pm.type === "card" ? pm.card_name || "Card" : pm.type.toUpperCase())}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{pm.type === "card" ? pm.masked_number : pm.masked_number || pm.bank_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pm.type === "netbanking" ? pm.bank_name : pm.type === "upi" ? "UPI" : ""}</div>
                            {pm.is_default && <div className="text-xs text-green-600 dark:text-green-400 mt-1">Default</div>}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => {
                                // choose this saved payment
                                setSelectedPaymentId(pm.id);
                                setPaymentType(pm.type);
                                // populate masked UI fields
                                if (pm.type === "card") {
                                  setCard({ number: pm.masked_number || "", name: pm.card_name || pm.holder_name || "", expiry: pm.card_expiry || "", cvv: "" });
                                } else if (pm.type === "upi") {
                                  setUpiId(pm.masked_number || "");
                                } else if (pm.type === "netbanking") {
                                  setSelectedBank(pm.bank_name || "");
                                  setBankUsername(pm.holder_name || "");
                                } else {
                                  // cod
                                }
                              }}
                              className={`px-3 py-1 rounded text-sm border ${selected ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
                            >
                              Use
                            </button>

                            <button
                              onClick={async () => {
                                // Delete saved payment (backend)
                                if (!token) {
                                  alert("Only logged-in users can delete saved payments.");
                                  return;
                                }
                                try {
                                  const resp = await fetch(`${API_BASE}/api/payments/${pm.id}`, {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  if (resp.ok) {
                                    setSavedPayments((s) => s.filter((x) => x.id !== pm.id));
                                    if (selectedPaymentId === pm.id) setSelectedPaymentId(null);
                                  } else {
                                    const err = await resp.json().catch(() => null);
                                    alert(err?.error || "Failed to delete payment");
                                  }
                                } catch (e) {
                                  console.error(e);
                                  alert("Failed to delete payment");
                                }
                              }}
                              className="px-3 py-1 rounded text-sm border text-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {paymentType === "upi" && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Select UPI App</div>
                  <div className="flex gap-3 flex-wrap">
                    {upiApps.map((app) => {
                      const selected = upiApp === app.id;
                      return (
                        <div key={app.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setUpiApp(app.id); }} onClick={() => { setUpiApp(app.id); setSelectedPaymentId(null); }} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${selected ? "ring-2 ring-offset-2 ring-black dark:ring-white scale-105" : "hover:shadow-sm"}`} aria-pressed={selected} aria-label={`Select ${app.name}`}>
                          <img src={app.icon} alt={app.name} className="w-12 h-12 object-contain" />
                          <div className="text-sm hidden sm:block">{app.name}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm mb-1">Enter UPI ID (e.g. name@bank)</label>
                    <input value={upiId} onChange={(e) => { setUpiId(e.target.value); setSelectedPaymentId(null); }} placeholder="your-vpa@bank" className="w-full border rounded px-3 py-2 dark:bg-gray-800" />
                  </div>
                </div>
              )}

              {paymentType === "netbanking" && (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="text-sm">Select bank</label>
                  <select value={selectedBank} onChange={(e) => { setSelectedBank(e.target.value); setSelectedPaymentId(null); }} className="border rounded px-3 py-2 dark:bg-gray-800">
                    <option value="">Select Bank</option>
                    <option value="SBI">State Bank of India</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="AXIS">Axis Bank</option>
                  </select>
                  <input placeholder="Netbanking username (demo)" value={bankUsername} onChange={(e) => { setBankUsername(e.target.value); setSelectedPaymentId(null); }} className="border rounded px-3 py-2 dark:bg-gray-800" />
                </div>
              )}

              {paymentType === "card" && (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <input
                    inputMode="numeric"
                    placeholder="Card number"
                    value={card.number}
                    onChange={(e) => {
                      setCard({ ...card, number: formatCardNumber(e.target.value) });
                      setSelectedPaymentId(null);
                    }}
                    className="border rounded px-3 py-2 dark:bg-gray-800"
                    maxLength={23}
                  />
                  <input
                    placeholder="Name on card"
                    value={card.name}
                    onChange={(e) => {
                      setCard({ ...card, name: e.target.value });
                      setSelectedPaymentId(null);
                    }}
                    className="border rounded px-3 py-2 dark:bg-gray-800"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(e) => {
                        setCard({ ...card, expiry: formatExpiry(e.target.value) });
                        setSelectedPaymentId(null);
                      }}
                      className="border rounded px-3 py-2 dark:bg-gray-800"
                      maxLength={5}
                    />
                    <input
                      inputMode="numeric"
                      placeholder="CVV"
                      value={card.cvv}
                      onChange={(e) => {
                        setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) });
                        setSelectedPaymentId(null);
                      }}
                      className="border rounded px-3 py-2 dark:bg-gray-800"
                      maxLength={4}
                    />
                  </div>
                </div>
              )}


              {paymentType === "cod" && (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Cash on Delivery selected — ₹25 COD fee will be added to your order.</div>
              )}
            </section>
          )}
        </div>

        {/* Right: Order summary sticky */}
        <aside className="sticky top-6">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow w-full">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Price Details</h4>
              <div className="text-sm text-gray-500">{checkoutItems.reduce((s, it) => s + it.quantity, 0)} items</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Items</span>
                <span>₹{fmt(itemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? "Free" : `₹${fmt(shippingCost)}`}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-green-600">
                  <span>Promo ({promoApplied.code})</span>
                  <span>-₹{fmt(promoApplied.amount)}</span>
                </div>
              )}
              {paymentType === "cod" && (
                <div className="flex justify-between text-sm">
                  <span>COD charges</span>
                  <span>₹{fmt(codCharge)}</span>
                </div>
              )}
            </div>

            <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{fmt(grandTotal)}</span>
            </div>

            <div className="mt-4">
              <div className="flex gap-3">
                {step > 1 ? (
                  <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="flex-1 px-4 py-2 rounded border bg-gray-100 dark:bg-gray-800 text-sm">Back</button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <button onClick={goNext} className="flex-1 px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:opacity-95 transition">Continue</button>
                ) : (
                  <motion.button
                    onClick={() => handlePayment()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`cssbuttons-io small shadow-neon-black flex-1 py-2 rounded-full flex items-center justify-center gap-2 transition ${(!isPaymentValid() || loading) ? "opacity-60 pointer-events-none" : ""}`}
                    aria-label="Pay Now"
                    type="button"
                    disabled={!isPaymentValid() || loading}
                  >
                    <CreditCard size={16} />
                    <span className="label">{loading ? "Processing..." : `Pay ₹${fmt(grandTotal)}`}</span>
                  </motion.button>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">Secure payment — demo only. On real integration we'd redirect to a payment gateway.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
