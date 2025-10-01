import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package as PackageIcon,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  User,
  Box,
  ArrowLeftRight,
  Info,
  Star,
} from "lucide-react";

// Order Details page (updated)
// - Removed local theme toggle (assumes global theme toggle in app/navbar that toggles the `dark` class on <html>)
// - Improved dark mode compatibility by using standard Tailwind neutral scales
// - Enhanced progress indicator (stepper) with icons + animated active step
// - Edit address button (inline prompt) that updates shipping address
// - Conditional Cancel / Return / Rate flows depending on delivery status
// - Rating form per product after delivery

export default function OrderDetailsPage() {
  // demo order data (now mutable via setOrder)
  const [order, setOrder] = useState({
    id: "FDX-20250929-12345",
    placedAt: "2025-09-25T11:32:00Z",
    paymentMethod: "Razorpay",
    status: "Out for delivery",
    tracking: [
      { step: "Order placed", date: "2025-09-25T11:32:00Z", done: true },
      { step: "Packed", date: "2025-09-26T07:12:00Z", done: true },
      { step: "Shipped", date: "2025-09-27T15:45:00Z", done: true },
      { step: "Out for delivery", date: "2025-09-29T07:50:00Z", done: false },
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
        title: "Premium Cotton T-shirt (Black)",
        qty: 1,
        price: 499,
        img: "https://via.placeholder.com/120x120.png?text=T-Shirt",
        options: "Size: M | Color: Black",
      },
      {
        id: 2,
        title: "Noise-cancelling Headphones",
        qty: 1,
        price: 2499,
        img: "https://via.placeholder.com/120x120.png?text=Headphones",
        options: "Color: Matte Black",
      },
    ],
    shipping: {
      name: "Kranthi",
      phone: "+91 78428 23230",
      address:
        "1-2-32, Agraharam, Pithapuram, Near Court and Cattle Market, East Godavari, Andhra Pradesh, 533450",
    },
    pricing: {
      subTotal: 2998,
      shippingCharge: 49,
      discount: 200,
      tax: 54.9,
      total: 2901.9,
    },
  });

  // ratings state (populated after delivery)
  const [ratings, setRatings] = useState({});

  // helpers
  const doneCount = order.tracking.filter((t) => t.done).length;
  const progressPercent = (doneCount / order.tracking.length) * 100;
  const isDelivered = order.status.toLowerCase() === "delivered" || order.tracking.some(t => t.step.toLowerCase() === 'delivered' && t.done) || false;

  // Cancel order handler
  function cancelOrder() {
    if (confirm("Are you sure you want to cancel this order?")) {
      setOrder((o) => ({ ...o, status: "Cancelled", tracking: o.tracking.map(t => t.step === 'Order placed' ? { ...t, done: true } : t) }));
      alert("Order cancelled — refund will be processed soon.");
    }
  }

  // Return request handler (simple demo)
  function requestReturn() {
    if (confirm("Request a return for this order?")) {
      setOrder((o) => ({ ...o, status: "Return requested" }));
      alert("Return requested. Seller will contact you soon.");
    }
  }

  // Edit address handler (simple prompt for demo)
  function editAddress() {
    const updated = prompt("Edit shipping address:", order.shipping.address);
    if (updated !== null) {
      setOrder((o) => ({ ...o, shipping: { ...o.shipping, address: updated } }));
    }
  }

  // Rating handlers
  function setProductRating(productId, rating) {
    setRatings((r) => ({ ...r, [productId]: { ...(r[productId] || {}), rating } }));
  }
  function setProductReview(productId, review) {
    setRatings((r) => ({ ...r, [productId]: { ...(r[productId] || {}), review } }));
  }
  function submitRating(productId) {
    const payload = ratings[productId];
    if (!payload || !payload.rating) return alert("Please give a rating before submitting.");
    // in real app: POST to server
    alert(`Thanks! Received rating for product ${productId}: ${payload.rating} ⭐`);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* NAVBAR: NOTE - removed local theme toggle. App is expected to provide a global theme toggle in the shared navbar. */}
      <nav className="border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a href="#" className="flex items-center gap-3">
              <div className="bg-black dark:bg-white text-white dark:text-black rounded px-3 py-2 font-bold">S</div>
              <div className="hidden sm:block">
                <div className="font-semibold">Shopline</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">Orders</div>
              </div>
            </a>

            <div className="hidden md:block">
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden">
                <input placeholder="Search orders, products, AWB..." className="px-3 py-1 bg-transparent outline-none w-72" />
                <button className="px-3 py-2 border-l border-neutral-200 dark:border-neutral-700">Search</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a className="hidden sm:flex items-center gap-2 px-3 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800" href="#">
              <User size={16} />
              <span className="text-sm">Kranthi</span>
            </a>
          </div>
        </div>
      </nav>

      {/* PAGE */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: timeline & package details (wide) */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Order Details</h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Order ID: <span className="font-mono">{order.id}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Placed on</p>
                  <p className="font-medium">{new Date(order.placedAt).toLocaleString()}</p>
                </div>
              </div>

              {/* tracking summary */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck />
                    <div>
                      <div className="text-sm">Courier</div>
                      <div className="font-medium">{order.courier.name} • AWB: {order.courier.awb}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm">Status</div>
                    <div className={`font-semibold ${isDelivered ? 'text-emerald-500' : 'text-amber-600 dark:text-amber-400'}`}>{order.status}</div>
                  </div>
                </div>

                {/* enhanced progress stepper */}
                <div className="mt-6">
                  <ProgressStepper steps={order.tracking} />

                  <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <div>Progress: <span className="font-medium">{doneCount}/{order.tracking.length}</span></div>
                    <div>{Math.round(progressPercent)}%</div>
                  </div>
                </div>

                {/* timeline */}
                <div className="mt-6 border-t border-neutral-100 dark:border-neutral-700 pt-4">
                  {order.tracking.map((t, i) => (
                    <TimelineItem key={i} item={t} first={i===0} last={i===order.tracking.length-1} />
                  ))}
                </div>

                {/* map & ETA/cards row */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded p-4">
                    <div className="text-sm font-medium mb-2">Live location (preview)</div>
                    <div className="h-40 rounded border border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-sm text-neutral-400">Map / Route preview</div>

                    <div className="mt-3 flex items-center gap-3 text-sm">
                      <MapPin size={16} />
                      <div>
                        <div className="font-medium">Delivering to</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">{order.shipping.address}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-neutral-500">ETA</div>
                        <div className="font-semibold">Today • 9:00 AM - 7:00 PM</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-neutral-500">Contact</div>
                        <div className="font-medium">{order.courier.phone}</div>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700 pt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div>Payment</div>
                        <div className="font-medium">{order.paymentMethod}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>Items</div>
                        <div className="font-medium">{order.items.length}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>Order value</div>
                        <div className="font-semibold">₹{order.pricing.total.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 py-2 rounded border border-neutral-200 dark:border-neutral-700 text-sm">Track on courier</button>
                      {!isDelivered && order.status.toLowerCase() !== 'cancelled' && (
                        <button onClick={() => window.alert('Contacting courier...')} className="flex-1 py-2 rounded bg-black dark:bg-white text-white dark:text-black text-sm">Contact courier</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMS LIST */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Items in this order</h3>
                {/* If delivered show summary message */}
                {isDelivered && <div className="text-sm text-neutral-500">Delivered — thank you!</div>}
              </div>

              <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-700">
                {order.items.map((it) => (
                  <div key={it.id} className="py-4">
                    <ProductRow product={it} />

                    {/* if delivered, show rating form */}
                    {isDelivered && (
                      <div className="mt-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded p-3">
                        <div className="text-sm font-medium mb-2">Rate this product</div>
                        <div className="flex items-center gap-3">
                          <StarRating value={(ratings[it.id] && ratings[it.id].rating) || 0} onChange={(val) => setProductRating(it.id, val)} />
                          <textarea value={(ratings[it.id] && ratings[it.id].review) || ''} onChange={(e) => setProductReview(it.id, e.target.value)} placeholder="Write a short review (optional)" className="flex-1 p-2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700" />
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => submitRating(it.id)} className="px-3 py-2 rounded bg-emerald-500 text-white">Submit rating</button>
                          <button onClick={() => setRatings((r) => ({ ...r, [it.id]: {} }))} className="px-3 py-2 rounded border">Clear</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="text-neutral-500">Have a question about an item?</div>
                <div className="flex gap-2">
                  {!isDelivered && order.status.toLowerCase() !== 'cancelled' && (
                    <button className="px-3 py-2 rounded border border-neutral-200 dark:border-neutral-700">Return/Replace</button>
                  )}
                  <button className="px-3 py-2 rounded bg-black dark:bg-white text-white dark:text-black">Contact Seller</button>
                </div>
              </div>
            </div>

            {/* SHIPPING & SUPPORT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <MapPin />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-neutral-500">Shipping Address</div>
                        <div className="font-medium">{order.shipping.name} • {order.shipping.phone}</div>
                        <div className="text-sm text-neutral-500 mt-1">{order.shipping.address}</div>
                      </div>
                      <div className="ml-4">
                        <button onClick={editAddress} className="px-3 py-1 rounded border text-sm">Edit address</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Phone />
                  <div>
                    <div className="text-sm text-neutral-500">Support</div>
                    <div className="font-medium">Help Center • 24/7</div>
                    <div className="text-sm text-neutral-500 mt-1">Call {order.courier.phone} or use in-app chat</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <a className="block text-amber-600 font-medium">Start chat with seller</a>
                  <a className="block text-amber-600 font-medium">Report a problem</a>
                  <a className="block text-amber-600 font-medium">Request refund</a>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: Order summary & actions */}
          <aside className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Order value</div>
                  <div className="text-xl font-semibold">₹{order.pricing.total.toFixed(2)}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-neutral-500">Items: {order.items.length}</div>
                  <div className="text-neutral-500">Shipping: ₹{order.pricing.shippingCharge}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {/* conditional actions */}
                {(!isDelivered && order.status.toLowerCase() !== 'cancelled') ? (
                  <>
                    <button onClick={cancelOrder} className="col-span-2 py-2 rounded border border-neutral-200 dark:border-neutral-700">Cancel order</button>
                    <button className="col-span-2 py-2 rounded bg-black dark:bg-white text-white dark:text-black">Track package</button>
                    <button className="col-span-2 py-2 rounded border border-neutral-200 dark:border-neutral-700">Download invoice</button>
                  </>
                ) : (
                  <>
                    {/* Delivered or cancelled */}
                    {isDelivered ? (
                      <>
                        <button onClick={requestReturn} className="col-span-2 py-2 rounded border border-neutral-200 dark:border-neutral-700">Request return</button>
                        <button onClick={() => window.alert('Open rating modal / thank you')} className="col-span-2 py-2 rounded bg-emerald-500 text-white">Rate products</button>
                        <button className="col-span-2 py-2 rounded border border-neutral-200 dark:border-neutral-700">Download invoice</button>
                      </>
                    ) : (
                      <div className="col-span-2 py-2 text-center text-sm text-neutral-500">Order is {order.status}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
              <div className="text-sm text-neutral-500">Payment</div>
              <div className="flex items-center gap-3 mt-2">
                <CreditCard />
                <div>
                  <div className="font-medium">{order.paymentMethod}</div>
                  <div className="text-sm text-neutral-500">Paid • ₹{order.pricing.total.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 text-sm">
              <div className="text-neutral-500">Shipping details</div>
              <div className="mt-2 font-medium">AWB: {order.courier.awb}</div>
              <div className="text-neutral-500 mt-1">Courier: {order.courier.name}</div>
              <div className="text-neutral-500 mt-1">Pickup at warehouse • 533450</div>
            </div>
          </aside>
        </div>

        {/* FOOTER small actions */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-neutral-500">Need help? Visit help center or call customer support.</div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded border">Share</button>
            <button className="px-3 py-2 rounded border">Save</button>
          </div>
        </div>
      </main>
    </div>
  );
}


// -------------------------
// Subcomponents
// -------------------------

function ProgressStepper({ steps = [] }) {
  // first incomplete index
  const currentIdx = steps.findIndex((s) => !s.done);
  const activeIndex = currentIdx === -1 ? steps.length - 1 : currentIdx;

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {/* connecting line */}
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800" />
        </div>

        {/* gradient progress */}
        <div className="absolute left-0 top-0 h-1 rounded-full overflow-hidden" style={{ width: `${((steps.filter(s=>s.done).length)/steps.length)*100}%` }}>
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-amber-400" />
        </div>

        {/* nodes */}
        {steps.map((s, i) => {
          const done = s.done;
          const isActive = i === activeIndex;
          return (
            <div key={i} className="relative flex-1 text-center z-10">
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : isActive ? 'bg-amber-500 text-white' : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'}`}
                >
                  {done ? <CheckCircle size={14} /> : isActive ? <Clock size={14} /> : <PackageIcon size={14} />}
                </motion.div>
              </div>
              <div className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">{s.step}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineItem({ item, first, last }) {
  return (
    <div className="relative flex items-start gap-4 py-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-700'}`}></div>
        {!last && <div className="flex-1 w-px bg-neutral-100 dark:bg-neutral-700 mt-1" style={{ minHeight: 24 }} />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="font-medium">{item.step}</div>
          <div className={`text-sm ${item.done ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {item.date ? new Date(item.date).toLocaleString() : <em>Pending</em>}
          </div>
        </div>
        <div className="mt-1 text-sm text-neutral-500">{item.done ? 'Completed' : 'In progress'}</div>
      </div>
    </div>
  );
}

function ProductRow({ product }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <img src={product.img} alt="product" className="w-20 h-20 object-cover rounded" />
      <div className="flex-1">
        <div className="font-medium">{product.title}</div>
        <div className="text-sm text-neutral-500">{product.options}</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-2">Qty: {product.qty}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold">₹{product.price}</div>
        <div className="text-sm text-neutral-500">Status: Ready to ship</div>
      </div>
    </div>
  );
}

function StarRating({ value = 0, onChange = () => {} }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} star`} className={`p-1 rounded ${n <= value ? 'bg-amber-400 text-white' : 'bg-transparent text-neutral-400 dark:text-neutral-500'}`}>
          <Star size={16} />
        </button>
      ))}
    </div>
  );
}
