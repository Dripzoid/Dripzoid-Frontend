import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package as PackageIcon,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  User,
  Info,
  Star,
} from "lucide-react";

/**
 * OrderDetailsPage - Flipkart/Amazon-inspired layout
 * - Black & white theme (dark mode controlled globally by toggling `dark` class on <html>)
 * - Track Order button replaces "See All Updates"
 * - Modern Tailwind utilities, responsive layout
 * - Modal components for confirm / input / info (in-file)
 *
 * Notes:
 * - Replace mock data / handlers with API calls (fetch/axios) where needed.
 */

export default function OrderDetailsPage() {
  const [order, setOrder] = useState({
    id: "OD335614556805540100",
    placedAt: "2025-10-01T08:30:00Z",
    paymentMethod: "Cash On Delivery",
    status: "Shipped",
    tracking: [
      { step: "Order confirmed", date: "2025-10-01T08:30:00Z", done: true },
      { step: "Shipped", date: "2025-10-01T11:15:00Z", done: true },
      { step: "Out for delivery", date: null, done: false },
      { step: "Delivered", date: null, done: false },
    ],
    courier: {
      name: "ShipQuick",
      phone: "+91 91234 56789",
      awb: "SQ123456789IN",
    },
    items: [
      {
        id: 1,
        title: "CAMPUS MIKE (N) Running Shoes For Men",
        qty: 1,
        price: 947,
        img: "https://via.placeholder.com/80x80.png?text=Shoes",
        options: "Size: 9, Black",
        seller: "CAMPUS COMPANY STORE",
      },
    ],
    shipping: {
      name: "K Yuvateja Sainadh",
      phone: "9390942546",
      address:
        "Home • Beside Vinayaka Temple, Ramesampeta Centre, Samalkot, Andhra Pradesh, 533450",
    },
    pricing: {
      listingPrice: 1999,
      sellingPrice: 1665,
      extraDiscount: 466,
      specialPrice: 1199,
      otherDiscount: 264,
      fees: 12,
      total: 947,
    },
  });

  // ratings state
  const [ratings, setRatings] = useState({});

  // modals
  const [showCancel, setShowCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showEditAddress, setShowEditAddress] = useState(false);
  const [info, setInfo] = useState({ open: false, title: "", message: "" });

  const doneCount = order.tracking.filter((t) => t.done).length;
  const progressPercent = Math.round((doneCount / order.tracking.length) * 100);
  const isDelivered =
    order.status.toLowerCase() === "delivered" ||
    order.tracking.some((t) => t.step.toLowerCase() === "delivered" && t.done);

  // NOTE: Replace the below handlers with real API calls
  function onCancelConfirm() {
    setOrder((o) => ({ ...o, status: "Cancelled" }));
    setInfo({ open: true, title: "Order cancelled", message: "Refund will be processed soon." });
  }
  function onReturnConfirm() {
    setOrder((o) => ({ ...o, status: "Return requested" }));
    setInfo({ open: true, title: "Return requested", message: "Seller will contact you soon." });
  }
  function onSaveAddress(newAddr) {
    setOrder((o) => ({ ...o, shipping: { ...o.shipping, address: newAddr } }));
    setInfo({ open: true, title: "Address updated", message: "Shipping address updated." });
  }

  function setProductRating(productId, rating) {
    setRatings((r) => ({ ...r, [productId]: { ...(r[productId] || {}), rating } }));
  }
  function setProductReview(productId, review) {
    setRatings((r) => ({ ...r, [productId]: { ...(r[productId] || {}), review } }));
  }
  function submitRating(productId) {
    const payload = ratings[productId];
    if (!payload || !payload.rating) {
      setInfo({ open: true, title: "Rating required", message: "Please choose a star rating." });
      return;
    }
    setInfo({ open: true, title: "Thanks!", message: `Rated ${payload.rating} ★ for product` });
    setRatings((r) => ({ ...r, [productId]: {} }));
  }

  function contactCourier() {
    setInfo({ open: true, title: "Contact courier", message: `Call ${order.courier.phone}` });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* breadcrumb */}
      <div className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
          Home &gt; My Account &gt; My Orders &gt; <span className="font-mono">{order.id}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Main panel */}
        <section className="lg:col-span-2 space-y-6">
          {/* Product header */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h1 className="text-lg font-semibold leading-tight">{order.items[0].title}</h1>
                <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{order.items[0].options}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">Seller: {order.items[0].seller}</div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="text-2xl font-bold">₹{order.items[0].price}</div>
                  <div className="text-sm text-emerald-600">1 offer</div>
                </div>
              </div>

              <div className="w-24 h-24 flex-shrink-0 rounded overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <img src={order.items[0].img} alt="product" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Timeline panel */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="text-neutral-600 dark:text-neutral-300" />
                <div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">Tracking status</div>
                  <div className="font-semibold">{order.status}</div>
                </div>
              </div>

              {/* Track Order button (replaces 'See all updates') */}
              <div>
                <button
                  onClick={() => setInfo({ open: true, title: "Track order", message: "Opening live track view..." })}
                  className="px-3 py-1.5 border rounded text-sm bg-black text-white dark:bg-white dark:text-black"
                >
                  Track Order
                </button>
              </div>
            </div>

            {/* Vertical timeline */}
            <div className="mt-6 flex gap-6">
              <div className="w-12 flex flex-col items-center">
                {/* vertical line */}
                <div className="relative h-full w-px bg-neutral-100 dark:bg-neutral-800">
                  {/* nothing */}
                </div>
              </div>

              <div className="flex-1">
                {/* stepper items - styled to look like flipkart */}
                <div className="space-y-4">
                  {order.tracking.map((t, idx) => {
                    const done = t.done;
                    const active = !done && order.tracking[idx - 1]?.done;
                    return (
                      <div key={t.step} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${done ? "bg-emerald-600 text-white" : active ? "bg-white border border-neutral-300 dark:border-neutral-700 text-amber-500" : "bg-white border border-neutral-200 dark:border-neutral-800 text-neutral-400"}`}
                          >
                            {done ? <CheckCircle size={14} /> : active ? <Clock size={14} /> : <PackageIcon size={14} />}
                          </div>
                          <div className="flex-1 w-px bg-neutral-100 dark:bg-neutral-800 mt-2" />
                        </div>

                        <div className="flex-1">
                          <div className={`font-medium ${done ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-500"}`}>{t.step}</div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t.date ? new Date(t.date).toLocaleString() : (done ? "" : "Pending")}</div>

                          {/* highlight shipped message like screenshot */}
                          {t.step.toLowerCase().includes("shipped") && done && (
                            <div className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded p-3 text-sm text-neutral-700 dark:text-neutral-200">
                              Your item has arrived at a delivery partner facility — {new Date(t.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-sm text-neutral-500">
                  Delivery Executive details will be available once the order is out for delivery
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    {!isDelivered && order.status.toLowerCase() !== "cancelled" ? (
                      <button onClick={() => setShowCancel(true)} className="w-full py-3 rounded border">
                        Cancel
                      </button>
                    ) : (
                      <button onClick={() => setShowReturn(true)} className="w-full py-3 rounded border">
                        Request Return
                      </button>
                    )}
                  </div>

                  <div className="w-44">
                    <button onClick={() => setInfo({ open: true, title: "Chat", message: "Opening chat with us..." })} className="w-full py-3 rounded border flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 0 1 2 2v7l-3-3H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h10z" /></svg>
                      Chat with us
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rate and Send order details area */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <h3 className="font-medium">Rate your experience</h3>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Did you find this page helpful?</div>
              <button className="px-3 py-2 rounded border text-sm">Give feedback</button>
            </div>

            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <button className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 6h16M4 18h16"/></svg>
                Send Order Details
              </button>
            </div>
          </div>
        </section>

        {/* Right - Sidebar */}
        <aside className="space-y-6">
          {/* Delivery details card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Delivery details</div>
            </div>

            <div className="mt-3 space-y-3">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 flex items-start justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Home</div>
                  <div className="text-sm text-neutral-700 dark:text-neutral-200">{order.shipping.address}</div>
                </div>
                <div className="self-center">
                  <button onClick={() => setShowEditAddress(true)} className="p-2 rounded-full border text-sm">Edit</button>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-800 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Contact</div>
                  <div className="text-sm font-medium">{order.shipping.name} • {order.shipping.phone}</div>
                </div>
                <div>
                  <button onClick={contactCourier} className="p-2 rounded-full border">Call</button>
                </div>
              </div>
            </div>
          </div>

          {/* Price details card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded shadow-sm p-4">
            <div className="font-medium">Price details</div>
            <div className="mt-3 text-sm space-y-2">
              <div className="flex justify-between text-neutral-500">
                <div>Listing price</div>
                <div className="line-through">₹{order.pricing.listingPrice}</div>
              </div>
              <div className="flex justify-between">
                <div>Selling price</div>
                <div>₹{order.pricing.sellingPrice}</div>
              </div>
              <div className="flex justify-between text-emerald-600">
                <div>Extra discount</div>
                <div>-₹{order.pricing.extraDiscount}</div>
              </div>
              <div className="flex justify-between">
                <div>Special price</div>
                <div>₹{order.pricing.specialPrice}</div>
              </div>
              <div className="flex justify-between text-emerald-600">
                <div>Other discount</div>
                <div>-₹{order.pricing.otherDiscount}</div>
              </div>
              <div className="flex justify-between text-neutral-500">
                <div>Total fees</div>
                <div>₹{order.pricing.fees}</div>
              </div>

              <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
                <div className="font-semibold">Total amount</div>
                <div className="font-semibold">₹{order.pricing.total}</div>
              </div>

              <div className="mt-3 text-sm text-neutral-500">Paid by <strong className="ml-1">Cash On Delivery</strong></div>
            </div>

            <div className="mt-4">
              <button className="w-full py-2 rounded border">Offers earned ▾</button>
            </div>
          </div>
        </aside>

        {/* Modals (end of page) */}
        <ConfirmModal
          open={showCancel}
          title="Cancel order"
          message="Are you sure you want to cancel this order?"
          confirmLabel="Yes, cancel"
          onClose={() => setShowCancel(false)}
          onConfirm={() => {
            onCancelConfirm();
            setShowCancel(false);
          }}
        />

        <ConfirmModal
          open={showReturn}
          title="Request return"
          message="Do you want to request a return for this order?"
          confirmLabel="Request return"
          onClose={() => setShowReturn(false)}
          onConfirm={() => {
            onReturnConfirm();
            setShowReturn(false);
          }}
        />

        <InputModal
          open={showEditAddress}
          title="Edit shipping address"
          initialValue={order.shipping.address}
          onClose={() => setShowEditAddress(false)}
          onConfirm={(val) => {
            onSaveAddress(val);
            setShowEditAddress(false);
          }}
        />

        <InfoModal open={info.open} title={info.title} message={info.message} onClose={() => setInfo({ open: false, title: "", message: "" })} />
      </main>
    </div>
  );
}

/* -------------------------
   Subcomponents
   ------------------------- */

function ConfirmModal({ open, title, message, confirmLabel = "Confirm", onClose = () => {}, onConfirm = () => {} }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700">
            <Info />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">{message}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={() => onConfirm()} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">{confirmLabel}</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputModal({ open, title, initialValue = "", onClose = () => {}, onConfirm = (val) => {} }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <textarea value={value} onChange={(e) => setValue(e.target.value)} className="w-full mt-3 p-3 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900" rows={4} />
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={() => onConfirm(value)} className="px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black">Save</button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoModal({ open, title = "", message = "", onClose = () => {} }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg max-w-sm w-full p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{message}</div>
            <div className="mt-3 text-right">
              <button onClick={onClose} className="px-3 py-1 rounded border">Close</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
