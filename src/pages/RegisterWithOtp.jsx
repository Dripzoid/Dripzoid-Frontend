// src/components/RegisterWithOTP.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // must be called at top level

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
const WIDGET_ID = process.env.REACT_APP_MSG91_WIDGET_ID;
const TOKEN = process.env.REACT_APP_MSG91_TOKEN;
const CAPTCHA_RENDER_ID = "msg91-captcha";

export default function RegisterWithOTP({ onVerified } = {}) {
  // ✅ hooks must be top-level
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [verified, setVerified] = useState(false);
  const [reqId, setReqId] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [loadingSdk, setLoadingSdk] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const autoSendRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // parse query params (prefill or auto-send)
  useEffect(() => {
    const search = location?.search || window.location.search || "";
    const params = new URLSearchParams(search);
    const emailParam = params.get("email");
    const sendParam = params.get("send"); // e.g. send=1 to auto-send
    const otpView = params.get("otp"); // optional otp=1 to show OTP view

    if (emailParam) setIdentifier(emailParam);
    if (otpView === "1" || sendParam === "1") setOtpSent(true);
    if (sendParam === "1") autoSendRef.current = true;
  }, [location]);

  const apiUrl = (path) => {
    if (!path.startsWith("/")) path = `/${path}`;
    return API_BASE ? `${API_BASE}${path}` : path;
  };

  const isEmail = (s) => /\S+@\S+\.\S+/.test(String(s || ""));
  const maskIdentifier = (s) => {
    if (!s) return "";
    if (isEmail(s)) {
      const [u, d] = s.split("@");
      return `${u.charAt(0)}***@${d}`;
    }
    return `***${String(s).slice(-4)}`;
  };

  useEffect(() => {
    setError("");
    setReqId("");
    setOtpValue("");
    setVerified(false);
  }, [identifier]);

  // MSG91 SDK load
  useEffect(() => {
    if (!WIDGET_ID || !TOKEN) {
      console.info("MSG91 widget ID or token missing; server fallback unavailable.");
      return;
    }

    if (window.__MSG91_INITIALIZED) {
      setSdkReady(typeof window.sendOtp === "function" && typeof window.verifyOtp === "function");
      if (autoSendRef.current && typeof window.sendOtp === "function") {
        setTimeout(() => {
          if (mountedRef.current) sendOtp();
        }, 100);
      }
      return;
    }

    setLoadingSdk(true);
    const script = document.createElement("script");
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.msg91 = "true";

    script.onload = () => {
      try {
        if (typeof window.initSendOTP === "function") {
          window.initSendOTP({
            widgetId: WIDGET_ID,
            tokenAuth: TOKEN,
            exposeMethods: true,
            captchaRenderId: CAPTCHA_RENDER_ID,
            success: (d) => console.debug("MSG91 global success:", d),
            failure: (err) => console.warn("MSG91 global failure:", err),
          });
          window.__MSG91_INITIALIZED = true;
          setSdkReady(true);
          console.info("MSG91 SDK initialized.");
        } else {
          setSdkReady(false);
          setError("MSG91 SDK init method missing.");
        }
      } catch (e) {
        setSdkReady(false);
        setError("MSG91 SDK load failed (see console).");
      } finally {
        if (mountedRef.current) setLoadingSdk(false);
      }

      if (autoSendRef.current && typeof window.sendOtp === "function") {
        setTimeout(() => {
          if (mountedRef.current) sendOtp();
        }, 100);
      }
    };

    script.onerror = (ev) => {
      console.error("MSG91 script load failed", ev);
      if (mountedRef.current) {
        setLoadingSdk(false);
        setSdkReady(false);
        setError("Failed to load MSG91 SDK script.");
      }
    };

    document.body.appendChild(script);
  }, []);

  // POST JSON helper
  const callBackend = async (path, body) => {
    try {
      const res = await fetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      console.error("Backend call failed:", err);
      return { ok: false, error: err };
    }
  };

  const checkEmailExists = async (email) => {
    if (!email || !isEmail(email)) return false;
    const { ok, json } = await callBackend("/api/check-email", { email });
    return ok && json?.exists;
  };

  const sendOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    if (!id) return setError("Please enter email or mobile first.");

    if (isEmail(id)) {
      const exists = await checkEmailExists(id);
      if (exists) return setError("Email already registered.");
    }

    setSending(true);
    try {
      if (sdkReady && typeof window.sendOtp === "function") {
        window.sendOtp(
          id,
          (data) => {
            console.log("SDK sendOtp success:", data);
            if (!mountedRef.current) return;
            setReqId(data?.reqId || data?.reqid || "");
            setOtpSent(true);
            setOtpValue("");
          },
          (err) => {
            console.error("SDK sendOtp error:", err);
            if (!mountedRef.current) return;
            setError("Failed to send OTP. Ensure SDK loaded correctly.");
          }
        );
      } else {
        setError("Server fallback not available. Ensure MSG91 SDK loads correctly.");
      }
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    const otp = (otpValue || "").trim();
    if (!id || !otp) return setError("Identifier and OTP are required.");

    setVerifying(true);
    try {
      if (sdkReady && typeof window.verifyOtp === "function") {
        window.verifyOtp(
          otp,
          async (data) => {
            console.log("SDK verify success:", data);
            if (data?.token) {
              const { ok, json } = await callBackend("/api/verify-access-token", { token: data.token });
              if (ok && json?.success) {
                setVerified(true);
                if (onVerified) onVerified({ email: id });
              } else {
                setError("Token verification failed (server).");
              }
            } else if (data?.status === "VERIFIED" || data?.status === "verified") {
              setVerified(true);
              if (onVerified) onVerified({ email: id });
            } else {
              setError("OTP verification failed (SDK).");
            }
          },
          (err) => {
            console.error("SDK verify error:", err);
            setError("OTP verification failed (SDK).");
          },
          reqId || undefined
        );
      } else {
        setError("Server fallback not available. Ensure MSG91 SDK loaded.");
      }
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  const continueToOtpPage = async () => {
    setError("");
    const id = (identifier || "").trim();
    if (!id) return setError("Please enter email or mobile first.");

    if (isEmail(id)) {
      const exists = await checkEmailExists(id);
      if (exists) return setError("Email already registered.");
    }

    const targetPath = `/register/otp?email=${encodeURIComponent(id)}&send=1&otp=1`;
    navigate(targetPath);
  };

  useEffect(() => {
    const search = location?.search || window.location.search || "";
    const params = new URLSearchParams(search);
    if (params.get("send") === "1") {
      if (sdkReady) {
        sendOtp();
        autoSendRef.current = false;
      } else {
        autoSendRef.current = true;
      }
    }
  }, [sdkReady, location]);

  const retryOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    if (!id) return setError("Missing identifier.");
    await sendOtp();
  };

  const onIdentifierKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      continueToOtpPage();
    }
  };
  const onOtpKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyOtp();
    }
  };

  const inputClass =
    "w-full pl-4 pr-4 py-3 rounded-full bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition";

  return (
    <div className="max-w-md mx-auto my-6 p-6">
      {!otpSent && !verified && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Register — enter email or mobile</h3>
          <input
            aria-label="email or mobile"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={onIdentifierKey}
            placeholder="you@example.com or 919876543210"
            className={inputClass}
            autoComplete="email"
          />

          <div className="flex gap-3 mt-4">
            <button onClick={continueToOtpPage} disabled={sending || loadingSdk} className="flex-1 py-3 rounded-full bg-black text-white disabled:opacity-50">
              Continue
            </button>
          </div>

          <div className="text-sm text-gray-500 mt-2">
            {loadingSdk ? "MSG91 SDK loading…" : sdkReady ? "MSG91 SDK available" : "MSG91 SDK not loaded — server fallback unavailable"}
          </div>

          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
        </div>
      )}

      {otpSent && !verified && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Enter OTP</h3>
          <div className="text-sm text-gray-700 mb-3">We sent an OTP to <strong>{maskIdentifier(identifier)}</strong></div>

          <input
            aria-label="otp"
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={onOtpKey}
            placeholder="Enter OTP"
            className={inputClass}
            inputMode="numeric"
            maxLength={8}
            autoFocus
          />

          <div className="flex gap-3 mt-4">
            <button onClick={verifyOtp} disabled={verifying} className="flex-1 py-3 rounded-full bg-black text-white disabled:opacity-50">
              {verifying ? "Verifying…" : "Verify OTP"}
            </button>
            <button onClick={retryOtp} className="py-3 px-4 rounded-full border dark:border-white/10">
              Resend
            </button>
          </div>

          <div className="text-sm text-gray-500 mt-2">{reqId ? `Request ID: ${reqId}` : "No request ID yet."}</div>
          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
        </div>
      )}

      {verified && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Verified ✅</h3>
          <p className="text-sm text-gray-700">You can now complete registration (enter personal details & password).</p>
        </div>
      )}

      <div id={CAPTCHA_RENDER_ID} style={{ marginTop: 6 }} />
    </div>
  );
}
