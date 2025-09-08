// src/components/RegisterWithOtp.jsx
import React, { useEffect, useState, useRef } from "react";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

export default function RegisterWithOtp({ email = "", onVerified, onBack } = {}) {
  const [identifier, setIdentifier] = useState(email || "");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [verified, setVerified] = useState(false);
  const [reqId, setReqId] = useState("");
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

  // Send OTP via backend
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
      const { ok, json, error } = await callBackend("/api/send-otp", { email: id });
      if (!ok) throw new Error(json?.message || error || "Failed to send OTP");
      if (mountedRef.current) {
        setReqId(json?.reqId || json?.reqid || "");
        setOtpSent(true);
        setOtpValue("");
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Failed to send OTP");
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  // Verify OTP via backend
  const verifyOtp = async () => {
    setError("");
    const id = (identifier || "").trim();
    const otp = (otpValue || "").trim();
    if (!id || !otp) return setError("Identifier and OTP are required.");

    setVerifying(true);
    try {
      const { ok, json, error } = await callBackend("/api/verify-otp", { email: id, otp });
      if (!ok) throw new Error(json?.message || error || "OTP verification failed");
      if (mountedRef.current) {
        if (json?.success) {
          setVerified(true);
          if (typeof onVerified === "function") onVerified({ email: id });
        } else {
          setError(json?.message || "OTP verification failed");
        }
      }
    } catch (err) {
      if (mountedRef.current) setError(err.message || "OTP verification failed");
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  // Auto-send OTP if email prop provided
  useEffect(() => {
    if (!email) return;
    if (autoSentRef.current) return;
    autoSentRef.current = true;
    sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

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
            <button onClick={sendOtp} disabled={sending} className="flex-1 py-3 rounded-full bg-black text-white disabled:opacity-50">
              {sending ? "Sending…" : "Send OTP"}
            </button>
            <button onClick={retryOtp} className="py-3 px-4 rounded-full border">
              Retry
            </button>
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
          <div className="text-sm text-gray-700 mb-3">
            We sent an OTP to <strong>{maskIdentifier(identifier)}</strong>
          </div>

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

          {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
        </div>
      )}

      {verified && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Verified ✅</h3>
          <p className="text-sm text-gray-700">You can now complete registration (enter personal details & password).</p>
        </div>
      )}
    </div>
  );
}
