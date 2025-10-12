import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import axios from "axios";
import {
  CheckCircle,
  DownloadCloud,
  MapPin,
  Printer,
  Package,
  ArrowRight,
  CreditCard,
} from "lucide-react";

/* --------------------------
   Helpers
   -------------------------- */

function generateOrderId() {
  const t = Date.now().toString(36).toUpperCase();
  return `ORD-${t.slice(-8)}`;
}

function fmtINR(n) {
  return typeof n === "number"
    ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : n;
}

function prettyDate(d) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* --------------------------
   Confetti (lightweight)
   -------------------------- */
function useConfetti(duration = 2500) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    const particles = [];
    const colors = ["#111111", "#ffffff", "#bdbdbd", "#111827", "#f3f4f6", "#9ca3af"];

    const count = Math.min(90, Math.floor((w * h) / 4000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * -h,
        w: 6 + Math.random() * 10,
        h: 6 + Math.random() * 12,
        vx: -1 + Math.random() * 2,
        vy: 2 + Math.random() * 4,
        angle: Math.random() * Math.PI,
        spin: -0.1 + Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let raf = null;
    const start = performance.now();

    function draw(now) {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);

      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (t < duration) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, w, h);
    }

    raf = requestAnimationFrame(draw);

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [duration]);

  return canvasRef;
}

/* --------------------------
   Component
   -------------------------- */

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const confettiCanvasRef = useConfetti(3000);

  const state = location.state ?? {};
  const incomingOrder = state.order ?? null;

  const stored = (() => {
    try {
      const raw = localStorage.getItem("lastOrder");
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return null;
  })();

  const order = incomingOrder ?? stored ?? {
    orderId: generateOrderId(),
    items: [{ id: "demo-1", name: "Demo Product", price: 799, quantity: 1, images: "" }],
    total: 799,
    paymentMethod: "COD",
    shipping: { name: "John Doe", address: "Demo address, City", phone: "9999999999" },
    orderDate: new Date().toISOString(),
  };

  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
  const amount = typeof order.total === "number"
    ? order.total
    : items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

  const orderId = order.orderId ?? generateOrderId();
  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
  const estimatedDelivery = new Date(orderDate.getTime() + (3 + Math.floor(Math.random() * 5)) * 86400000);
  const shipping = order.shipping ?? { name: "John Doe", address: "Demo address, City", phone: "9999999999" };
  const paymentMethod = order.paymentMethod ?? (order.paymentDetails ? "Online" : "COD");
  const [downloading, setDownloading] = useState(false);

  /* --------------------------
     Download Invoice (API)
     -------------------------- */
  const downloadInvoice = async () => {
    try {
      setDownloading(true);
      const BASE = process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "";
      const url = `${BASE}/api/shipping/download-invoice`;

      const response = await axios.post(
        url,
        { order_id: orderId },
        {
          responseType: "blob",
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Invoice download failed:", err);
      alert("Unable to download invoice. Please try again later.");
    } finally {
      setDownloading(false);
    }
  };

  /* --------------------------
     Track Order Redirect
     -------------------------- */
  const handleTrack = () => {
    window.location.href = `https://dripzoid.com/order-details/${orderId}`;
  };

  return (
    <div className="min-h-screen flex items-start justify-center py-10 px-4">
      <canvas
        ref={confettiCanvasRef}
        className="pointer-events-none fixed inset-0 z-10"
        style={{ width: "100%", height: "100%", top: 0, left: 0 }}
      />

      <div className="relative w-full max-w-4xl z-20">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <div className="flex items-start gap-6">
            <div className="flex-none">
              <div className="w-28 h-28 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg">
                <CheckCircle className="w-14 h-14" />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Thank you — your order is confirmed!
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                We've received your order and will send you a confirmation email shortly.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded border bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-gray-500">Order ID</div>
                  <div className="font-medium mt-1">{orderId}</div>
                </div>
                <div className="p-3 rounded border bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-gray-500">Order Date</div>
                  <div className="font-medium mt-1">{prettyDate(orderDate)}</div>
                </div>
                <div className="p-3 rounded border bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-gray-500">Est. Delivery</div>
                  <div className="font-medium mt-1">{prettyDate(estimatedDelivery)}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 items-center">
                <button
                  onClick={downloadInvoice}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black transition hover:scale-[1.02] shadow"
                >
                  <DownloadCloud className="w-4 h-4" />{" "}
                  {downloading ? "Preparing..." : "Download Invoice"}
                </button>

                <button
                  onClick={handleTrack}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <MapPin className="w-4 h-4" /> Track Order
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>

                <button
                  onClick={() => navigate("/shop")}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gray-800 to-black text-white dark:from-white dark:to-gray-200 dark:text-black hover:opacity-95 transition"
                >
                  Continue shopping <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                  Items in your order
                </h3>
                <div className="hidden sm:block">
                  <Barcode value={String(orderId)} format="CODE128" height={40} displayValue={false} />
                </div>
              </div>

              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((it, idx) => (
                  <li key={it.id ?? idx} className="py-3 flex items-center gap-4">
                    <img
                      src={it.images?.split?.(",")?.[0] ?? "/placeholder.jpg"}
                      alt={it.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{it.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Qty: {it.quantity}
                      </div>
                    </div>
                    <div className="text-right font-semibold">
                      ₹{fmtINR(Number(it.price) * Number(it.quantity))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Package className="w-4 h-4" /> Order summary
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items ({items.reduce((s, i) => s + Number(i.quantity), 0)})</span>
                  <span>₹{fmtINR(amount)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>

                <div className="flex justify-between">
                  <span>Payment method</span>
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>{paymentMethod}</span>
                  </span>
                </div>

                <div className="border-t pt-3 mt-3 flex justify-between font-bold">
                  <span>Total paid</span>
                  <span>₹{fmtINR(amount)}</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                We’ll send tracking updates to your email and phone number.
              </div>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Shipping Address</h4>
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <div className="font-medium">{shipping.name}</div>
              <div>{shipping.address}</div>
              <div>{shipping.phone}</div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-4">
          Order ID <span className="font-medium">{orderId}</span> — Need help?{" "}
          <button onClick={() => navigate("/help")} className="underline">
            Contact support
          </button>
        </div>
      </div>
    </div>
  );
}
