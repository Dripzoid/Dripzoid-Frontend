// src/pages/Auth.jsx
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Smartphone, CheckCircle } from "lucide-react";

// ✅ Import your new OTP component
import  RegisterWithOtp from "./RegisterWithOtp";

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
    gender: "",
    dob: "",
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
          gender: formData.gender,
          dob: formData.dob,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        alert("Registration successful — please login.");
        setIsLogin(true);
        setRegStep("enterEmail");
        setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "", gender: "", dob: "" });
      } else {
        alert(json.message || "Registration failed");
      }
    } catch (err) {
      console.error("complete-registration error:", err);
      alert("Server error");
    }
  };

  const handleGoogleAuth = () => {
    // Redirect to backend Google OAuth entry point
    window.location.href = buildUrl("/api/auth/google");
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-full bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition";
  const buttonPrimary =
    "w-full py-3 rounded-full bg-black text-white hover:shadow active:scale-[0.995] disabled:opacity-50";

  const GoogleButton = ({ children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-3 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center gap-3 hover:shadow"
    >
      {/* inline Google icon (simple) */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.35 11.1H12v2.8h5.35C16.9 16 14.8 17.5 12 17.5c-4 0-7.3-3.3-7.3-7.3S8 3 12 3c1.9 0 3.55.65 4.85 1.95l-2.2 2.15C13.9 6.9 13 6.5 12 6.5 9.24 6.5 7 8.74 7 11.5S9.24 16.5 12 16.5c3 0 4.7-1.9 4.7-4.2 0-.35-.05-.7-.1-1.2z" fill="currentColor" />
      </svg>
      <span className="text-sm font-medium">{children}</span>
    </button>
  );

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
              {isLogin ? "Sign in to continue" : "Register with email OTP or Google"}
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

            <div className="flex items-center justify-between text-sm">
              <label className="text-transparent">placeholder</label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm underline underline-offset-2"
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className={buttonPrimary}>Login</button>

            {/* OR separator */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-black/10" />
              <div className="text-sm text-gray-500">or</div>
              <div className="flex-1 h-px bg-black/10" />
            </div>

            <GoogleButton onClick={handleGoogleAuth}>Continue with Google</GoogleButton>
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

                {/* OR separator */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-black/10" />
                  <div className="text-sm text-gray-500">or</div>
                  <div className="flex-1 h-px bg-black/10" />
                </div>

                <GoogleButton onClick={handleGoogleAuth}>Sign up with Google</GoogleButton>
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

                {/* gender */}
                <div className="relative">
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-full bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                  >
                    <option value="">Select gender (optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    <User size={16} />
                  </span>
                </div>

                {/* dob */}
                <div className="relative">
                  <input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                    placeholder="Date of birth"
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

                {/* OR separator */}
                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-black/10" />
                  <div className="text-sm text-gray-500">or</div>
                  <div className="flex-1 h-px bg-black/10" />
                </div>

                <GoogleButton onClick={handleGoogleAuth}>Sign up with Google</GoogleButton>
              </form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
