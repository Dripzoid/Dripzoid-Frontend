// src/pages/CheckoutPage.jsx
// CheckoutPage with Razorpay as primary payment method and COD fallback

import React, { useEffect, useMemo, useState, useContext } from "react";
import { useCart } from "../contexts/CartContext";
import { Check, CreditCard, ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { UserContext } from "../contexts/UserContext";  

/**
 * Razorpay integration notes (frontend):
 * - Adds a single Razorpay option (paymentType === 'razorpay') + 'cod'
 * - When user chooses Razorpay and places order, we call server endpoint
 *   POST /api/payments/razorpay/create-order with the order payload.
 *   Server should create internal order + create a Razorpay order and return
 *   at minimum: { razorpayOrderId, amount, currency, internalOrderId }
 * - We then open Razorpay Checkout using the returned razorpayOrderId.
 * - On successful payment, the checkout handler will POST to
 *   POST /api/payments/razorpay/verify with the payment details + internal order id
 *   Server should verify signature and mark order as paid.
 * - COD uses the existing /api/orders/place-order flow.
 */

const API_BASE = process.env.REACT_APP_API_BASE;
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY_ID || "";

export default function CheckoutPage() {
  const { cart = [], fetchCart } = useCart();
  const { user, token } = useContext(UserContext) || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(null);

  const emptyShipping = { name: "", address: "", phone: "", pincode: "", state: "", country: "" };
  const [shipping, setShipping] = useState(emptyShipping);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Only two payment types now: razorpay (online) and cod
  const [paymentType, setPaymentType] = useState("");
  const [savedPayments, setSavedPayments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [loading, setLoading] = useState(false);

  const upiApps = [
    { name: "Google Pay", id: "gpay" },
    { name: "PhonePe", id: "phonepe" },
    { name: "Paytm", id: "paytm" },
    { name: "BHIM", id: "bhim" },
  ];

  // Load saved addresses/payments (same as before)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedAddresses");
      if (raw) setSavedAddresses(JSON.parse(raw));
    } catch (e) {}

    if (!token) return;

    const fetchSaved = async () => {
      try {
        const aRes = await fetch(`${API_BASE}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } });
        if (aRes.ok) {
          const addresses = await aRes.json();
          if (Array.isArray(addresses)) {
            const mapped = addresses.map((a) => ({
              ...a,
              name: a.label || a.name || `${a.line1 || ""}${a.line2 ? ", " + a.line2 : ""}`,
              address: a.line1 ? `${a.line1}${a.line2 ? ", " + a.line2 : ""}` : a.address || "",
            }));
            setSavedAddresses(mapped);
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

        const pRes = await fetch(`${API_BASE}/api/payments`, { headers: { Authorization: `Bearer ${token}` } });
        if (pRes.ok) {
          const payments = await pRes.json();
          if (Array.isArray(payments)) setSavedPayments(payments);
        }
      } catch (e) {
        console.error("Failed to fetch saved addresses/payments:", e);
      }
    };

    fetchSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // --- NORMALIZATION ---
  const checkoutItems = useMemo(() => {
    const incoming = Array.isArray(location.state?.items) ? location.state.items : cart;
    return (Array.isArray(incoming) ? incoming : []).map((it, idx) => {
      const prod = it.product ?? it;
      const cartRowId = it.cart_id ?? it.id ?? null;
      const productId = it.product_id ?? prod.id ?? null;
      const uniqueId = productId ? `p-${productId}` : cartRowId ? `c-${cartRowId}` : `itm-${idx}`;
      const name = prod.name ?? it.name ?? "Unnamed";
      const price = Number(prod.price ?? it.price ?? 0);
      const quantity = Number(it.quantity ?? it.qty ?? 1);
      const images = Array.isArray(prod.images) ? prod.images.join(",") : prod.images ?? it.images ?? it.image ?? "";
      return { cart_id: cartRowId, product_id: productId, id: uniqueId, name, price, quantity, images, original: prod };
    });
  }, [location.state, cart]);

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : n);

  const itemsTotal = checkoutItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const shippingCost = 0;
  const codCharge = paymentType === "cod" ? 25 : 0;
  const discount = promoApplied?.amount ?? 0;
  const grandTotal = Math.max(0, itemsTotal + shippingCost + codCharge - discount);

  const isShippingValid = () => shipping.name.trim() && shipping.address.trim() && shipping.phone.trim() && shipping.pincode.trim();

  // Payment validation: accept saved payment OR razorpay OR cod
  const isPaymentValid = () => {
    if (selectedPaymentId) return true; // not used in current flow but kept for compatibility
    if (paymentType === "razorpay") return true;
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

  // Address save/delete/select functions unchanged (kept for brevity in this file)
  const handleSaveAddress = async () => {
    if (!isShippingValid()) return alert("Please fill required shipping fields before saving.");
    if (!token) {
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
    if (!payload.line1 || !payload.city || !payload.state || !payload.pincode) return alert("To save to your account please ensure Address, State and Pincode are filled.");
    try {
      const res = await fetch(`${API_BASE}/api/addresses`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) {
        const newAddr = await res.json();
        const mapped = { ...newAddr, name: newAddr.label || `${newAddr.line1}${newAddr.line2 ? ", " + newAddr.line2 : ""}`, address: newAddr.line1 ? `${newAddr.line1}${newAddr.line2 ? ", " + newAddr.line2 : ""}` : newAddr.address || "" };
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

  const handleDeleteAddress = async (addrId) => {
    if (!token) {
      const rest = savedAddresses.filter((s) => s.id !== addrId);
      localStorage.setItem("savedAddresses", JSON.stringify(rest));
      setSavedAddresses(rest);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/addresses/${addrId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSavedAddresses((s) => s.filter((s) => s.id !== addrId));
      else { const err = await res.json().catch(() => null); alert(err?.message || "Failed to delete address"); }
    } catch (e) { console.error(e); alert("Failed to delete address"); }
  };

  const handleSelectSavedAddress = (addr) => {
    const mappedShipping = {
      name: addr.label ?? addr.name ?? "",
      address: addr.line1 ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}` : addr.address ?? "",
      phone: addr.phone ?? "",
      pincode: addr.pincode ?? "",
      state: addr.state ?? "",
      country: addr.country ?? "India",
    };
    setShipping(mappedShipping);
    setStep(3);
  };

  const goNext = () => {
    if (step === 2 && !isShippingValid()) { alert("Please provide Name, Address, Phone and Pincode."); return; }
    setStep((s) => Math.min(3, s + 1));
  };

  const isBuyNowMode = location.state?.mode === "buy-now" || location.state?.fromBuyNow === true;
  const fromCartDefault = typeof location.state?.fromCart === "boolean" ? location.state.fromCart : !isBuyNowMode;

  // ---------------- RAZORPAY HELPERS ----------------
  const loadRazorpayScript = () => new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const createRazorpayOrderOnServer = async (orderPayload) => {
    const res = await fetch(`${API_BASE}/api/payments/razorpay/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Create order failed (status ${res.status})`);
    }
    return res.json();
  };

  const verifyRazorpayPayment = async (verifyPayload) => {
    const res = await fetch(`${API_BASE}/api/payments/razorpay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(verifyPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || `Payment verification failed (status ${res.status})`);
    }
    return res.json();
  };

  // Main payment handler: directs to Razorpay flow for online payments or posts order for COD
  const handlePayment = async ({ fromCart = fromCartDefault } = {}) => {
    if (!isPaymentValid()) { alert("Please complete the payment selection."); return; }
    if (!token) { alert("Please log in to place an order."); navigate("/login"); return; }

    setLoading(true);

    // Build payload similar to previous logic (cart vs buyNow)
    try {
      let orderPayload = null;

      if (!fromCart) {
        const buyNowItems = checkoutItems.map((item) => ({ product_snapshot: item.original ?? null, product_id: item.product_id ?? item.original?.id ?? item.original?._id ?? null, price: Number(item.price || 0), quantity: Number(item.quantity || 1) }));
        orderPayload = { buyNow: true, items: buyNowItems, totalAmount: grandTotal, paymentMethod: paymentType || 'razorpay', shippingAddress: shipping };
      } else {
        const cartItemsPayload = checkoutItems.map((item) => {
          if (item.cart_id !== null && item.cart_id !== undefined) { const maybeNum = Number(item.cart_id); return { id: Number.isFinite(maybeNum) ? maybeNum : item.cart_id, quantity: Number(item.quantity || 1) }; }
          const pidCandidate = item.product_id ?? item.original?.id ?? item.original?._id ?? null;
          if (pidCandidate === null || pidCandidate === undefined) return null;
          const asNum = Number(pidCandidate);
          if (Number.isFinite(asNum)) return { product_id: asNum, quantity: Number(item.quantity || 1) };
          return { product_id: String(pidCandidate), quantity: Number(item.quantity || 1) };
        }).filter(Boolean);
        orderPayload = { cartItems: cartItemsPayload, totalAmount: grandTotal, paymentMethod: paymentType || 'razorpay', shippingAddress: shipping };
      }

      // If COD, use existing place-order endpoint (server will mark payment as COD)
      if (paymentType === "cod") {
        const res = await fetch(`${API_BASE}/api/orders/place-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...orderPayload, paymentDetails: { cod: true } }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) { alert((data && (data.error || data.message)) || `Failed to place order (status ${res.status})`); setLoading(false); return; }

        const order = { orderId: data?.orderId ?? data?.order?.id ?? null, items: checkoutItems, total: grandTotal, paymentMethod: 'cod', customerName: shipping.name || user?.name || 'Guest', shipping, orderDate: new Date().toISOString() };
        try { localStorage.setItem("lastOrder", JSON.stringify(order)); if (fromCart && typeof fetchCart === "function") await fetchCart(); } catch (e) { console.warn("Local storage save failed", e); }
        navigate("/order-confirmation", { state: { order } });
        return;
      }

      // For Razorpay online flow
      // 1) ask server to create an internal + Razorpay order
      const serverResp = await createRazorpayOrderOnServer({ ...orderPayload, totalAmount: Math.round(grandTotal) });
      // expected serverResp: { razorpayOrderId, amount, currency, internalOrderId }
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay SDK");

      const rOrderId = serverResp?.razorpayOrderId || serverResp?.orderId || serverResp?.order?.razorpayOrderId;
      const amount = serverResp?.amount ?? serverResp?.razorpayAmount ?? Math.round(grandTotal);
      const currency = serverResp?.currency ?? "INR";
      const internalOrderId = serverResp?.internalOrderId ?? serverResp?.orderId ?? serverResp?.order?.id ?? null;

      if (!rOrderId) throw new Error("Server did not return a Razorpay order id");

      const options = {
        key: RAZORPAY_KEY,
        amount: amount * 100 || Math.round(grandTotal * 100), // ensure paise (server should already give paise but we guard)
        currency,
        name: "Your Store",
        description: "Order Payment",
        order_id: rOrderId,
        prefill: { name: shipping.name || user?.name || "", email: user?.email || "", contact: shipping.phone || "" },
        handler: async function (response) {
          // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
          try {
            const verifyResp = await verifyRazorpayPayment({ ...response, internalOrderId, orderPayload });
            // server should mark order paid and return order info
            const orderInfo = verifyResp?.order || { orderId: internalOrderId };
            const order = { orderId: orderInfo?.id ?? orderInfo?.orderId ?? internalOrderId, items: checkoutItems, total: grandTotal, paymentMethod: 'razorpay', customerName: shipping.name || user?.name || 'Guest', shipping, orderDate: new Date().toISOString() };
            try { localStorage.setItem("lastOrder", JSON.stringify(order)); if (fromCart && typeof fetchCart === "function") await fetchCart(); } catch (e) { console.warn("Local storage save failed", e); }
            navigate("/order-confirmation", { state: { order } });
          } catch (err) {
            console.error("Verification failed", err);
            alert("Payment was processed but verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: function () {
            // user closed modal
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong while placing the order.");
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (v) => { const digits = v.replace(/\D/g, "").slice(0, 19); return digits.replace(/(.{4})/g, "$1 ").trim(); };
  const formatExpiry = (v) => { const digits = v.replace(/\D/g, "").slice(0, 4); if (digits.length <= 2) return digits; return digits.slice(0, 2) + "/" + digits.slice(2); };

  useEffect(() => {}, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-gray-900 dark:text-gray-100">
      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-6">
        { ["Review", "Shipping", "Payment"].map((label, idx) => {
            const i = idx + 1;
            const active = step === i;
            const done = step > i;
            return (
              <div key={label} className="flex-1">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition ${done ? "bg-green-500 text-white" : active ? "bg-black text-white dark:bg-white dark:text-black" : "border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-400 bg-white dark:bg-gray-900"}`} aria-hidden>
                    {done ? <Check size={16} /> : i}
                  </div>
                  <div className="text-sm">
                    <div className={`font-medium ${active ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>{label}</div>
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
        checkoutItems.map((it) => (
          <div key={it.id} className="flex items-start gap-4">
            <img
              src={it.images?.split?.(",")?.[0] ?? "/placeholder.jpg"}
              alt={it.name}
              className="w-20 h-20 object-cover rounded-md"
            />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {it.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {it.original?.category ?? ""}
                  </div>

                  {/* NEW: Show selected color & size */}
                  {(it.original?.selectedColor || it.original?.selectedSize) && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {it.original?.selectedColor && (
                        <span>Color: {it.original.selectedColor}</span>
                      )}
                      {it.original?.selectedSize && (
                        <span className="ml-2">Size: {it.original.selectedSize}</span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 text-sm font-semibold">
                    ₹{fmt(it.price)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Qty {it.quantity}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>

              <div className="mt-6 border-t pt-4 space-y-3">
                <div className="flex justify-between text-sm"><span>Items total</span><span>₹{fmt(itemsTotal)}</span></div>
                <div className="flex justify-between text-sm"><span>Shipping</span><span>{shippingCost === 0 ? "Free" : `₹${fmt(shippingCost)}`}</span></div>
                {promoApplied && (<div className="flex justify-between text-sm text-green-600"><span>Promo ({promoApplied.code})</span><span>-₹{fmt(promoApplied.amount)}</span></div>)}
                <div className="flex justify-between text-lg font-bold pt-2"><span>Order Total</span><span>₹{fmt(itemsTotal + shippingCost - (promoApplied?.amount ?? 0))}</span></div>
                <div className="mt-4 flex gap-2">
                  <input aria-label="Promo code" placeholder="Promo code (demo)" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="flex-1 border px-3 py-2 rounded dark:bg-gray-800" />
                  <button onClick={applyPromo} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition">Apply</button>
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

              {savedAddresses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className="border rounded-2xl p-4 bg-white dark:bg-black text-gray-900 dark:text-gray-100 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-semibold">{addr.label || addr.name || (addr.name && addr.name.trim()) || "Address"}</div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{addr.line1 ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}` : addr.address}</div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{addr.city ? `${addr.city}, ${addr.state}` : addr.state} • {addr.pincode ?? ""}</div>
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{addr.phone}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {addr.is_default && <div className="text-xs font-medium text-green-600 dark:text-green-400">Default</div>}
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleSelectSavedAddress(addr)} className="text-sm px-3 py-1 rounded border bg-black text-white dark:bg-white dark:text-black">Use</button>
                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-sm px-3 py-1 rounded border text-red-600">Remove</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {Object.keys(shipping).map((field) => (
                  <input key={field} aria-label={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={shipping[field]} onChange={(e) => setShipping({ ...shipping, [field]: e.target.value })} className="border rounded px-3 py-2 dark:bg-gray-800" />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Save this address for future</span>
                </label>

                {saveAddress && (<button onClick={handleSaveAddress} className="ml-2 px-3 py-1 rounded border bg-black text-white dark:bg-white dark:text-black">Save</button>)}
              </div>
            </section>
          )}

          {/* Step 3: Payment (only Razorpay and COD) */}
          {step === 3 && (
            <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Payment</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ id: "razorpay", label: "Pay Online (Razorpay)" }, { id: "cod", label: "Cash on Delivery" }].map((m) => (
                  <button key={m.id} onClick={() => { setPaymentType(m.id); setSelectedPaymentId(null); }} className={`flex items-center justify-center gap-2 border rounded p-3 text-sm font-medium transition ${paymentType === m.id ? "bg-black text-white dark:bg-white dark:text-black shadow" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"}`} aria-pressed={paymentType === m.id}>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* COD explanatory message */}
              {paymentType === "cod" && (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Cash on Delivery selected — ₹25 COD fee will be added to your order.</div>
              )}

              <div className="mt-4 text-xs text-gray-500">Secure payment — Razorpay will handle card/UPI/netbanking flows in a single checkout. COD is supported as a fallback.</div>
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
              <div className="flex justify-between"><span>Items</span><span>₹{fmt(itemsTotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? "Free" : `₹${fmt(shippingCost)}`}</span></div>
              {promoApplied && (<div className="flex justify-between text-green-600"><span>Promo ({promoApplied.code})</span><span>-₹{fmt(promoApplied.amount)}</span></div>)}
              {paymentType === "cod" && (<div className="flex justify-between text-sm"><span>COD charges</span><span>₹{fmt(codCharge)}</span></div>)}
            </div>

            <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg"><span>Total</span><span>₹{fmt(grandTotal)}</span></div>

            <div className="mt-4">
              <div className="flex gap-3">
                {step > 1 ? (<button onClick={() => setStep((s) => Math.max(1, s - 1))} className="flex-1 px-4 py-2 rounded border bg-gray-100 dark:bg-gray-800 text-sm">Back</button>) : (<div />)}

                {step < 3 ? (
                  <button onClick={goNext} className="flex-1 px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black text-sm hover:opacity-95 transition">Continue</button>
                ) : (
                  <motion.button onClick={() => handlePayment()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`cssbuttons-io small shadow-neon-black flex-1 py-2 rounded-full flex items-center justify-center gap-2 transition ${(!isPaymentValid() || loading) ? "opacity-60 pointer-events-none" : ""}`} aria-label="Place Order" type="button" disabled={!isPaymentValid() || loading}>
                    <CreditCard size={16} />
                    <span className="label">{loading ? "Processing..." : `Place order ₹${fmt(grandTotal)}`}</span>
                  </motion.button>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500">Note: Server endpoints required: POST /api/payments/razorpay/create-order and POST /api/payments/razorpay/verify</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
