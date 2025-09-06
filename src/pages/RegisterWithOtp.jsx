// src/components/RegisterWithOtp.jsx
import React, { useEffect, useState, useRef } from "react";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
const WIDGET_SRC = "https://verify.msg91.com/otp-provider/otp-provider.js"; // prefer full path
const WIDGET_ID = process.env.REACT_APP_MSG91_WIDGET_ID;
const TOKEN = process.env.REACT_APP_MSG91_TOKEN;
const CAPTCHA_RENDER_ID = "msg91-captcha";

export default function RegisterWithOtp({ email = "", onVerified, onBack } = {}) {
  const [identifier, setIdentifier] = useState(email || "");
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
  const autoSentRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  useEffect(() => {
    // if parent passed email prop after mount, update local identifier
    if (email && email !== identifier) setIdentifier(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

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

  // Load MSG91 SDK script (non-blocking). Prefer index.html preload, but still safe to attempt here.
  useEffect(() => {
    if (!WIDGET_ID || !TOKEN) {
      // no widget creds -> skip SDK load, rely on backend fallback
      console.info("MSG91 widget ID or token missing; will use server fallback if available.");
      return;
    }

    // If already initialized by someone else, just set ready
    if (window.__MSG91_INITIALIZED) {
      setSdkReady(typeof window.sendOtp === "function" && typeof window.verifyOtp === "function");
      return;
    }

    setLoadingSdk(true);
    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.type = "text/javascript";
    script.async = true;
    // DON'T set crossOrigin here (some hosts return no CORS headers and that causes blocking)
    script.onload = () => {
      try {
        if (typeof window.initSendOTP === "function") {
          window.initSendOTP({
            widgetId: WIDGET_ID,
            tokenAuth: TOKEN,
            exposeMethods: true,
            captchaRenderId: CAPTCHA_RENDER_ID,
            success: (d) => console.debug("MSG91 SDK global success:", d),
            failure: (err) => console.warn("MSG91 SDK global failure:", err),
          });
          window.__MSG91_INITIALIZED = true;
          setSdkReady(true);
        } else {
          // Some versions expose different init name; treat as not ready
          setSdkReady(false);
          console.warn("MSG91 init method not found on window.");
        }
      } catch (e) {
        console.error("MSG91 init error:", e);
        setSdkReady(false);
      } finally {
        if (mountedRef.current) setLoadingSdk(false);
      }

      // if auto-sent was queued (we had email prop), try sending now
      if (autoSentRef.current && typeof window.sendOtp === "function") {
        setTimeout(() => {
          if (mountedRef.current) sendOtp();
        }, 120);
      }
    };
    script.onerror = (e) => {
      console.warn("MSG91 script load failed", e);
      if (mountedRef.current) {
        setLoadingSdk(false);
        setSdkReady(false);
      }
    };

    document.body.appendChild(script);
    // cleanup: do not remove script on unmount (so other components can reuse)
  }, []);

  // Helper: POST JSON
  const callBackend = async (path, body) => {
    try {
      const res = await fetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      return { ok: false, error: err };
    }
  };

  // Check if email exists using backend endpoint
  const checkEmailExists = async (emailToCheck) => {
    if (!emailToCheck || !isEmail(emailToCheck)) return false;
    const { ok, json } = await callBackend("/api/check-email", { email: emailToCheck });
    return ok && !!json?.exists;
  };

  // Try server fallback send-otp
  const sendOtpBackend = async (id) => {
    const { ok, status, json, error } = await callBackend("/api/send-otp", { email: id });
    if (!ok) {
      console.warn("send-otp backend failed:", status, error || json);
      throw new Error(json?.message || "Server send-otp failed");
    }
    return json;
  };

  // Try server fallback verify-otp
  const verifyOtpBackend = async (id, otp) => {
    const { ok, status, json, error } = await callBackend("/api/verify-otp", { email: id, otp });
    if (!ok) {
      console.warn("verify-otp backend failed:", status, error || json);
      throw new Error(json?.message || "Server verify-otp failed");
    }
    return json;
  };

  // SEND OTP (prefers SDK, falls back to backend)
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
      // SDK path
      if (sdkReady && typeof window.sendOtp === "function") {
        window.sendOtp(
          id,
          (data) => {
            if (!mountedRef.current) return;
            setReqId(data?.reqId || data?.reqid || "");
            setOtpSent(true);
            setOtpValue("");
          },
          (err) => {
            console.warn("SDK sendOtp error:", err);
            if (!mountedRef.current) return;
            // Fallback to backend if SDK failed
            setError("MSG91 SDK failed to send OTP — trying server fallback...");
            // try backend fallback
            sendOtpBackend(id)
              .then((json) => {
                if (mountedRef.current) {
                  setReqId(json?.reqId || json?.reqid || "");
                  setOtpSent(true);
                }
              })
              .catch((e) => {
                if (mountedRef.current) setError(e.message || "Failed to send OTP");
              });
          }
        );
        return;
      }

      // Backend fallback
      const json = await sendOtpBackend(id);
      if (mountedRef.current) {
        setReqId(json?.reqId || json?.reqid || "");
        setOtpSent(true);
        setError("");
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Failed to send OTP");
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  // VERIFY OTP (prefers SDK, falls back to backend)
  const verifyOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    const otp = (otpValue || "").trim();
    if (!id || !otp) return setError("Identifier and OTP are required.");

    setVerifying(true);
    try {
      // SDK path
      if (sdkReady && typeof window.verifyOtp === "function") {
        window.verifyOtp(
          otp,
          async (data) => {
            // SDK reports result
            if (data?.token) {
              // server-side verification of widget token
              const { ok, json } = await callBackend("/api/verify-access-token", { token: data.token });
              if (ok && json?.success) {
                setVerified(true);
                if (typeof onVerified === "function") onVerified({ email: id });
              } else {
                setError("Token verification failed on server.");
              }
            } else if (data?.status === "VERIFIED" || data?.status === "verified") {
              setVerified(true);
              if (typeof onVerified === "function") onVerified({ email: id });
            } else {
              setError("OTP verification failed (SDK).");
            }
          },
          (err) => {
            console.warn("SDK verify error:", err);
            // try server fallback
            verifyOtpBackend(id, otp)
              .then((json) => {
                if (mountedRef.current && json?.success) {
                  setVerified(true);
                  if (typeof onVerified === "function") onVerified({ email: id });
                } else {
                  if (mountedRef.current) setError(json?.message || "OTP verification failed");
                }
              })
              .catch((e) => {
                if (mountedRef.current) setError(e.message || "OTP verification failed (server)");
              });
          },
          reqId || undefined
        );
        return;
      }

      // Backend fallback
      const json = await verifyOtpBackend(id, otp);
      if (mountedRef.current) {
        if (json?.success) {
          setVerified(true);
          if (typeof onVerified === "function") onVerified({ email: id });
        } else {
          setError(json?.message || "OTP verification failed (server)");
        }
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || "OTP verification failed");
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  // If component rendered with an email prop, auto-send OTP once (tries SDK first if ready, otherwise queues)
  useEffect(() => {
    if (!email) return;
    // If already auto-sent, skip
    if (autoSentRef.current) return;
    autoSentRef.current = true;

    // If SDK is already ready: send immediately
    if (sdkReady) {
      sendOtp();
    } else {
      // otherwise wait for sdk-ready or fallback after a short timeout
      const timeout = setTimeout(() => {
        if (!sdkReady) sendOtp(); // try backend fallback
      }, 1500);

      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, sdkReady]);

  const retryOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    if (!id) return setError("Missing identifier.");
    await sendOtp();
  };

  const onIdentifierKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendOtp();
    }
  };
  const onOtpKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyOtp();
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 p-6">
      {!otpSent && !verified && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Register — enter email or mobile</h3>
            {typeof onBack === "function" && (
              <button onClick={onBack} className="text-sm text-gray-600 underline">
                Back
              </button>
            )}
          </div>

          <input
            aria-label="email or mobile"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={onIdentifierKey}
            placeholder="you@example.com or 919876543210"
            className="w-full pl-4 pr-4 py-3 rounded-full border"
            autoComplete="email"
          />

          <div className="flex gap-3 mt-4">
            <button onClick={sendOtp} disabled={sending || loadingSdk} className="flex-1 py-3 rounded-full bg-black text-white disabled:opacity-50">
              {sending ? "Sending…" : "Send OTP"}
            </button>
            <button
              onClick={() => {
                // manual fallback to backend send
                sendOtp();
              }}
              className="py-3 px-4 rounded-full border"
            >
              Retry
            </button>
          </div>

          <div className="text-sm text-gray-500 mt-2">
            {loadingSdk ? "MSG91 SDK loading…" : sdkReady ? "MSG91 SDK available" : "MSG91 SDK not loaded — using server fallback if available"}
          </div>

          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
        </div>
      )}

      {otpSent && !verified && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Enter OTP</h3>
            {typeof onBack === "function" && (
              <button onClick={onBack} className="text-sm text-gray-600 underline">
                Back
              </button>
            )}
          </div>
          <div className="text-sm text-gray-700 mb-3">We sent an OTP to <strong>{maskIdentifier(identifier)}</strong></div>

          <input
            aria-label="otp"
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={onOtpKey}
            placeholder="Enter OTP"
            className="w-full pl-4 pr-4 py-3 rounded-full border"
            inputMode="numeric"
            maxLength={8}
            autoFocus
          />

          <div className="flex gap-3 mt-4">
            <button onClick={verifyOtp} disabled={verifying} className="flex-1 py-3 rounded-full bg-black text-white disabled:opacity-50">
              {verifying ? "Verifying…" : "Verify OTP"}
            </button>
            <button onClick={retryOtp} className="py-3 px-4 rounded-full border">
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

      {/* Optional captcha container (SDK may render here) */}
      <div id={CAPTCHA_RENDER_ID} style={{ marginTop: 6 }} />
    </div>
  );
}
