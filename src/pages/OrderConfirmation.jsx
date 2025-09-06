// src/pages/OrderConfirmation.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
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
   PDF & Barcode loaders (from CDN)
   -------------------------- */
async function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-asset="jspdf"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.jspdf));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    s.async = true;
    s.setAttribute("data-asset", "jspdf");
    s.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf);
      else reject(new Error("jsPDF loaded but not available"));
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function loadJsBarcode() {
  if (window.JsBarcode) return window.JsBarcode;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-asset="jsbarcode"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.JsBarcode));
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
    s.async = true;
    s.setAttribute("data-asset", "jsbarcode");
    s.onload = () => {
      if (window.JsBarcode) resolve(window.JsBarcode);
      else reject(new Error("JsBarcode loaded but not available"));
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* --------------------------
   Component
   -------------------------- */

export default function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const confettiCanvasRef = useConfetti(3000);

  // Accept either location.state.order OR fallback to localStorage 'lastOrder' or demo
  const state = location.state ?? {};
  const incomingOrder = state.order ?? null;

  const stored = (() => {
    try {
      const raw = localStorage.getItem("lastOrder");
      if (raw) return JSON.parse(raw);
    } catch (e) {
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

  // Normalize fields
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];
  const amount = typeof order.total === "number" ? order.total : items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const orderId = order.orderId ?? generateOrderId();
  const orderDate = order.orderDate ? new Date(order.orderDate) : new Date();
  const estimatedDelivery = new Date(orderDate.getTime() + (3 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000);
  const shipping = order.shipping ?? { name: "John Doe", address: "Demo address, City", phone: "9999999999" };
  const paymentMethod = order.paymentMethod ?? (order.paymentDetails ? "Online" : "COD");

  const [downloading, setDownloading] = useState(false);

  // Generate a barcode PNG dataURL using JsBarcode (drawn to an offscreen canvas)
  async function generateBarcodeDataURL(value, opts = {}) {
    try {
      await loadJsBarcode();
      const canvas = document.createElement("canvas");
      // JsBarcode supports rendering to canvas element
      window.JsBarcode(canvas, String(value), {
        format: opts.format || "CODE128",
        displayValue: false,
        height: opts.height || 40,
        margin: opts.margin ?? 0,
        width: opts.width || 2,
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("Barcode generation failed:", err);
      return null;
    }
  }

  // Download invoice as a real PDF using jsPDF and embedded barcode
  const downloadInvoice = async () => {
    setDownloading(true);
    try {
      const jspdfMod = await loadJsPDF();
      const { jsPDF } = jspdfMod;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const left = 40;
      let cursorY = 48;

      doc.setFontSize(18);
      doc.text(`Invoice — ${orderId}`, left, cursorY);

      // Try to add barcode image on right
      try {
        const barcodeDataUrl = await generateBarcodeDataURL(orderId, { height: 50, width: 2 });
        if (barcodeDataUrl) {
          // place at approx top-right
          doc.addImage(barcodeDataUrl, "PNG", 360, 28, 180, 40);
        }
      } catch (e) {
        // continue without barcode
        console.warn("barcode to PDF failed", e);
      }

      doc.setFontSize(11);
      cursorY += 26;
      doc.text(`Order Date: ${prettyDate(orderDate)}`, left, cursorY);
      doc.text(`Amount: ₹${fmtINR(amount)}`, 450, cursorY);

      // Shipping block
      cursorY += 22;
      doc.setFontSize(12);
      doc.text("Shipping to:", left, cursorY);
      doc.setFontSize(10);
      cursorY += 16;
      doc.text(shipping.name || "", left, cursorY);
      cursorY += 14;
      const splitAddr = doc.splitTextToSize(String(shipping.address || ""), 480);
      doc.text(splitAddr, left, cursorY);
      cursorY += splitAddr.length * 12;
      doc.text(String(shipping.phone || ""), left, cursorY);

      // Items table header
      cursorY += 26;
      doc.setFontSize(11);
      doc.text("Item", left, cursorY);
      doc.text("Qty", 380, cursorY);
      doc.text("Price", 460, cursorY);
      cursorY += 8;
      doc.setLineWidth(0.5);
      doc.line(left, cursorY, 540, cursorY);
      cursorY += 12;

      // Rows
      doc.setFontSize(10);
      items.forEach((it, idx) => {
        const lineY = cursorY + idx * 16;
        const name = String(it.name || it.original?.name || "Item");
        doc.text(name.length > 60 ? name.slice(0, 57) + "..." : name, left, lineY);
        doc.text(String(it.quantity || 1), 380, lineY);
        doc.text(`₹${fmtINR(Number(it.price || 0) * Number(it.quantity || 1))}`, 460, lineY);
      });
      cursorY += items.length * 16 + 12;

      // Totals block
      doc.setFontSize(11);
      doc.text("Total", left, cursorY);
      doc.text(`₹${fmtINR(amount)}`, 460, cursorY);

      // Footer notes
      cursorY += 28;
      doc.setFontSize(9);
      doc.text("Thank you for shopping with us. This is a demo invoice.", left, cursorY);

      // Save PDF
      doc.save(`invoice-${orderId}.pdf`);
    } catch (err) {
      console.error("PDF generation failed, falling back to printable HTML", err);

      // fallback printable HTML (auto-print)
      const invoiceHtml = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <title>Invoice - ${orderId}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#111;padding:20px} h1{font-size:20px} .row{display:flex;justify-content:space-between} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{padding:8px;border-bottom:1px solid #e6e6e6;text-align:left}.total{font-weight:700;font-size:18px}</style>
        </head>
        <body>
          <h1>Invoice — ${orderId}</h1>
          <div class="row"><div>Order Date: ${prettyDate(orderDate)}</div><div>Amount: ₹${fmtINR(amount)}</div></div>
          <div style="margin-top:12px"><strong>Shipping to</strong><div>${shipping.name}</div><div>${shipping.address}</div><div>${shipping.phone}</div></div>
          <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>
            ${items.map(it => `<tr><td>${it.name}</td><td>${it.quantity}</td><td>₹${fmtINR(Number(it.price)*Number(it.quantity))}</td></tr>`).join("")}
          </tbody></table>
          <div style="margin-top:16px" class="row"><div></div><div class="total">Total: ₹${fmtINR(amount)}</div></div>
          <script>setTimeout(()=>{ window.print(); }, 500);</script>
        </body>
        </html>
      `;
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        const blob = new Blob([invoiceHtml], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `invoice-${orderId}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        w.document.write(invoiceHtml);
        w.document.close();
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleTrack = () => {
    navigate(`/track-order/${orderId}`, { state: { orderId } });
  };

  // show confetti once when mounted
  useEffect(() => {
    // confetti already started by useConfetti
  }, []);

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thank you — your order is confirmed!</h1>
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
                  <DownloadCloud className="w-4 h-4" /> {downloading ? "Preparing..." : "Download Invoice"}
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

          {/* Order summary card */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Items in your order</h3>
                {/* Page barcode using react-barcode for visual */}
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
                      <div className="text-sm text-gray-500 dark:text-gray-400">Qty: {it.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{fmtINR(Number(it.price) * Number(it.quantity))}</div>
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
                  <span>₹{fmtINR(items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0))}</span>
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
                We will send tracking updates to your email and phone number. If you have questions, visit our Help Center.
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Shipping Address</h4>
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <div className="font-medium">{shipping.name}</div>
              <div>{shipping.address}</div>
              <div>{shipping.phone}</div>
            </div>
          </div>
        </div>

        {/* subtle footer note */}
        <div className="text-center text-xs text-gray-500 mt-4">
          Order ID <span className="font-medium">{orderId}</span> — Need help?{" "}
          <button onClick={() => navigate("/help")} className="underline">Contact support</button>
        </div>
      </div>
    </div>
  );
}
