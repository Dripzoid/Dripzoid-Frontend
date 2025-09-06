// src/pages/Auth.jsx
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Smartphone, CheckCircle } from "lucide-react";

// ✅ Import your new OTP component
import RegisterWithOtp from "./RegisterWithOtp";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");
function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${API_BASE}${path}`;
}

export default function Auth({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  // registration flow
  const [regStep, setRegStep] = useState("enterEmail"); // enterEmail | otpSent | enterDetails

  // keep your form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((s) => ({ ...s, [id]: value }));
  };

  // ------------------- LOGIN -------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(buildUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email?.trim(), password: formData.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        if (typeof onLoginSuccess === "function") onLoginSuccess(data.user, data.token);
        navigate("/account");
      } else {
        if (res.status === 404) {
          setIsLogin(false);
          setRegStep("enterEmail");
        } else {
          alert(data.message || "Login failed");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error");
    }
  };

  // ------------------- REG: CONTINUE -------------------
  const proceedToOtpStep = async (e) => {
    e?.preventDefault?.();
    const email = (formData.email || "").trim().toLowerCase();
    if (!email) return alert("Enter an email");

    try {
      const res = await fetch(buildUrl("/api/check-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.exists) {
        alert("Email already registered — please log in.");
        setIsLogin(true);
        return;
      }
    } catch (err) {
      console.error("check-email error:", err);
      return alert("Server error");
    }

    setRegStep("otpSent"); // now handled by RegisterWithOtp component
  };

  // ------------------- REG: COMPLETE -------------------
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match.");
    }

    try {
      const res = await fetch(buildUrl("/api/complete-registration"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email?.trim().toLowerCase(),
          password: formData.password,
          mobile: formData.mobile,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        alert("Registration successful — please login.");
        setIsLogin(true);
        setRegStep("enterEmail");
        setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "" });
      } else {
        alert(json.message || "Registration failed");
      }
    } catch (err) {
      console.error("complete-registration error:", err);
      alert("Server error");
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-full bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition";
  const buttonPrimary =
    "w-full py-3 rounded-full bg-black text-white hover:shadow active:scale-[0.995] disabled:opacity-50";

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-md p-8 md:p-10 rounded-3xl bg-white/95 dark:bg-black/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-xl bg-black text-white">
            <CheckCircle size={22} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-gray-600">
              {isLogin ? "Sign in to continue" : "Register with email OTP"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setRegStep("enterEmail");
            }}
            className={isLogin ? "px-5 py-2 rounded-full bg-black text-white" : "px-5 py-2 rounded-full"}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setRegStep("enterEmail");
            }}
            className={!isLogin ? "px-5 py-2 rounded-full bg-black text-white" : "px-5 py-2 rounded-full"}
          >
            Register
          </button>
        </div>

        {/* Forms */}
        {isLogin ? (
          // ✅ LOGIN FORM
          <form key="login" onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            {/* email */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                <Mail size={16} />
              </span>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>
            {/* password */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                <Lock size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" className={buttonPrimary}>Login</button>
          </form>
        ) : (
          <>
            {/* STEP 1: Enter Email */}
            {regStep === "enterEmail" && (
              <form key="reg-email" onSubmit={proceedToOtpStep} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    <Mail size={16} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className={inputClass}
                  />
                </div>
                <button type="submit" className={buttonPrimary}>Continue</button>
              </form>
            )}

            {/* STEP 2: OTP Page (delegated) */}
            {regStep === "otpSent" && (
              <RegisterWithOtp
                email={formData.email}
                onVerified={() => setRegStep("enterDetails")}
                onBack={() => setRegStep("enterEmail")}
              />
            )}

            {/* STEP 3: Enter Details */}
            {regStep === "enterDetails" && (
              <form key="reg-details" onSubmit={handleCompleteRegistration} className="flex flex-col gap-4">
                {/* name */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    <User size={16} />
                  </span>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full name"
                    required
                    className={inputClass}
                  />
                </div>
                {/* mobile */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    <Smartphone size={16} />
                  </span>
                  <input
                    id="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className={inputClass}
                  />
                </div>
                {/* password */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    <Lock size={16} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* confirm password */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    <Lock size={16} />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="submit" className={buttonPrimary}>Create account</button>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
