// src/pages/Auth.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Smartphone, CheckCircle } from "lucide-react";

import RegisterWithOtp from "./RegisterWithOtp";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export default function Auth({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | register | forgot
  const [regStep, setRegStep] = useState("enterEmail"); // enterEmail | otpSent | enterDetails

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    gender: "",
    dob: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reg_email");
    if (saved && !formData.email) setFormData((s) => ({ ...s, email: saved }));
  }, []);

  // ------------- Theme-friendly classes -------------
  const inputClass =
    "w-full pl-12 pr-4 py-3 rounded-full text-black bg-white border border-black placeholder-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black transition " +
    "dark:text-white dark:bg-black dark:border-white dark:placeholder-white/50 dark:focus-visible:ring-white";

  const primaryClasses =
    "w-full py-3 rounded-full font-semibold shadow-sm bg-black text-white hover:brightness-110 active:scale-[0.995] disabled:opacity-60 " +
    "dark:bg-white dark:text-black dark:border dark:border-white";

  const googleBtnBase =
    "w-full flex items-center justify-center gap-3 py-2 px-3 rounded-full border border-black shadow-sm transition " +
    "bg-white text-black dark:bg-black dark:text-white dark:border-white";

  const motionBtnProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.985 },
    transition: { type: "spring", stiffness: 400, damping: 28 },
  };

  const GoogleIcon = ({ className = "" }) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 33 30 36 24 36c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 11.9 1 2 10.9 2 23s9.9 22 22 22c11 0 21-8 21-22 0-1.5-.2-2.6-.4-3z"/>
      <path fill="#FF3D00" d="M6.3 14.7l7.3 5.3C15.3 16.1 19.2 13 24 13c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 16.1 1 9 6.8 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 47c5.6 0 10.6-1.9 14.4-5.1l-6.7-5.4C30.9 37.7 27.8 39 24 39c-6 0-10.9-3.8-12.8-9.2l-7.4 5.7C7.9 41.8 15.3 47 24 47z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.1 5.6-5.7 7.3 0 0 9.9-7 13-13.8 0 0 .3-1.3.3-1.4z"/>
    </svg>
  );

  const GoogleButton = ({ children, onClick }) => (
    <motion.button {...motionBtnProps} type="button" onClick={onClick} className={googleBtnBase}>
      <GoogleIcon />
      <span className="text-sm font-medium">{children}</span>
    </motion.button>
  );

  // ------------- Input handling -------------
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    if (!id) return;
    setFormData((s) => ({ ...s, [id]: val }));
  };

  // ------------- Login -------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: (formData.email || "").trim(), password: formData.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        if (typeof onLoginSuccess === "function") onLoginSuccess(data.user, data.token);
        navigate("/account");
      } else if (res.status === 404) {
        alert("Email not found. Please register.");
        setMode("register");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      alert("Login error");
    } finally {
      setLoading(false);
    }
  };

  // ------------- Forgot password -------------
  const handleSendResetOtp = async () => {
    const email = (formData.email || "").trim();
    if (!email) return alert("Enter your email");
    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setOtpVerified(false);
        setMode("forgot-otp");
      } else {
        alert(json.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Server error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = (formData.email || "").trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;
    if (!otpVerified) return alert("Please verify OTP first");
    if (!password || !confirmPassword) return alert("Enter new password");
    if (password !== confirmPassword) return alert("Passwords do not match");

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        alert("Password reset successful. Please login.");
        setMode("login");
        setFormData({ ...formData, password: "", confirmPassword: "" });
      } else {
        alert(json.message || "Failed to reset password");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ------------- Register submit -------------
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return alert("Passwords do not match");

    const email = (formData.email || "").trim().toLowerCase() || localStorage.getItem("reg_email") || "";
    const name = (formData.name || "").trim();
    const password = formData.password;
    if (!name || !email || !password) return alert("Fill name, email, password");

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, email }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (json.token && typeof onLoginSuccess === "function") onLoginSuccess(json.user, json.token);
        alert("Registration successful!");
        setMode("login");
        localStorage.removeItem("reg_email");
        setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "", gender: "", dob: "" });
      } else {
        alert(json.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error registering");
    } finally {
      setLoading(false);
    }
  };

  // ------------- Rendering -------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full max-w-md p-8 md:p-10 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-lg bg-black dark:bg-white text-white dark:text-black">
            <CheckCircle size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create your account"}
              {mode.startsWith("forgot") && "Forgot Password"}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {mode === "login" && "Sign in to continue"}
              {mode === "register" && "Register with email OTP or Google"}
              {mode.startsWith("forgot") && "Reset your password using OTP"}
            </p>
          </div>
        </div>

        {/* Mode switch buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`px-5 py-2 rounded-full text-sm font-medium ${
              mode === "login" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent text-black dark:text-white"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`px-5 py-2 rounded-full text-sm font-medium ${
              mode === "register" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent text-black dark:text-white"
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className={`px-5 py-2 rounded-full text-sm font-medium ${
              mode.startsWith("forgot") ? "bg-black text-white dark:bg-white dark:text-black" : "bg-transparent text-black dark:text-white"
            }`}
          >
            Forgot
          </button>
        </div>

        {/* --- Render Forms --- */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                <Mail size={16} />
              </span>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                <Lock size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                autoComplete="current-password"
                className={inputClass}
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </motion.button>
          </form>
        )}

        {mode === "register" && (
          <>
            {regStep === "enterEmail" && (
              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
                <RegisterWithOtp
                  email={formData.email}
                  onVerified={() => setRegStep("enterDetails")}
                  onBack={() => setRegStep("enterEmail")}
                />
              </form>
            )}
            {regStep === "enterDetails" && (
              <form onSubmit={handleCompleteRegistration} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <User size={16} />
                  </span>
                  <input
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                    className={inputClass}
                  />
                </div>
                <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>
                  {loading ? "Creating..." : "Create Account"}
                </motion.button>
              </form>
            )}
          </>
        )}

        {mode.startsWith("forgot") && (
          <>
            {!otpVerified ? (
              <div className="flex flex-col gap-4">
                <RegisterWithOtp
                  email={formData.email}
                  onVerified={() => setOtpVerified(true)}
                  onBack={() => setMode("login")}
                />
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <Lock size={16} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="New Password"
                    required
                    className={inputClass}
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <Lock size={16} />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    required
                    className={inputClass}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </motion.button>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
