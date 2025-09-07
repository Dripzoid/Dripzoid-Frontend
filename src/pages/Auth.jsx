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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // placeholder for future side-effects
  }, []);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFormData((s) => ({ ...s, [id]: val }));
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setRegStep("enterEmail");
    setFormData((s) => ({ ...s, password: "", confirmPassword: "" }));
  };
  const switchToRegister = () => {
    setIsLogin(false);
    setRegStep("enterEmail");
    setFormData((s) => ({ ...s, password: "", confirmPassword: "" }));
  };

  // ------------------- LOGIN -------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
          switchToRegister();
        } else {
          alert(data.message || "Login failed");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error");
    } finally {
      setLoading(false);
    }
  };

  // ------------------- REG: CONTINUE -------------------
  const proceedToOtpStep = async (e) => {
    e?.preventDefault?.();
    const email = (formData.email || "").trim().toLowerCase();
    if (!email) return alert("Enter an email");

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/check-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.exists) {
        alert("Email already registered — please log in.");
        switchToLogin();
        return;
      }
    } catch (err) {
      console.error("check-email error:", err);
      return alert("Server error");
    } finally {
      setLoading(false);
    }

    setRegStep("otpSent");
  };

  // ------------------- REG: COMPLETE -------------------
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return alert("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/register"), {
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
        switchToLogin();
        setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "", gender: "", dob: "" });
      } else {
        alert(json.message || "Registration failed");
      }
    } catch (err) {
      console.error("complete-registration error:", err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    window.location.href = buildUrl("/api/auth/google");
  };

  const inputClass =
    "w-full pl-12 pr-4 py-3 rounded-full bg-white/60 dark:bg-slate-900/60 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 transition";

  const buttonPrimary =
    "w-full py-3 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold shadow hover:brightness-105 active:scale-[0.995] disabled:opacity-60";

  const subtleButton = "w-full py-3 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm";

  const GoogleButton = ({ children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${children}`}
      className="w-full flex items-center justify-center gap-3 py-2 px-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition"
    >
      {/* Google G logo (official-ish simplified) */}
      <svg className="w-5 h-5" viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs></defs>
        <path fill="#4285F4" d="M23 9.5c3.9 0 7.2 1.4 9.5 3.6l7.1-7.1C34.8 2.9 29.2 0.5 23 0.5 14 0.5 6.2 5.9 2.7 13.1l8.3 6.5C12.9 13.6 17.6 9.5 23 9.5z"/>
        <path fill="#34A853" d="M45.5 23c0-1.5-.1-2.7-.4-4H23v8.1h12.3c-.5 2.7-2 5-4.2 6.6l6.9 5.3C42.8 36.6 45.5 30.3 45.5 23z"/>
        <path fill="#FBBC05" d="M11 28.1c-1-2.7-1-5.7 0-8.4L2.7 13.1C1 16.8 0 20.8 0 24.9s1 8.1 2.7 11.8L11 28.1z"/>
        <path fill="#EA4335" d="M23 45.5c6.2 0 11.8-2.4 16.1-6.4l-6.9-5.3c-2 1.4-4.5 2.2-9.2 2.2-5.4 0-10.1-4.1-11.9-9.6L2.7 33.9C6.2 41.1 14 45.5 23 45.5z"/>
      </svg>
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{children}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-white dark:from-slate-900 dark:to-slate-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md p-8 md:p-10 rounded-2xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-neutral-100 dark:border-neutral-800 shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-700 text-white">
            <CheckCircle size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{isLogin ? "Welcome back" : "Create your account"}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{isLogin ? "Sign in to continue" : "Register with email OTP or Google"}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={switchToLogin}
            className={isLogin ? "px-5 py-2 rounded-full bg-neutral-900 text-white text-sm font-medium" : "px-5 py-2 rounded-full text-sm font-medium bg-transparent"}
          >
            Login
          </button>
          <button
            type="button"
            onClick={switchToRegister}
            className={!isLogin ? "px-5 py-2 rounded-full bg-neutral-900 text-white text-sm font-medium" : "px-5 py-2 rounded-full text-sm font-medium bg-transparent"}
          >
            Register
          </button>
        </div>

        {isLogin ? (
          <form key="login" onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <Mail size={16} />
              </span>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" className={inputClass} />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <Lock size={16} />
              </span>
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter password" required autoComplete="current-password" className={inputClass} />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div />
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm underline text-neutral-600 dark:text-neutral-400 underline-offset-2">
                Forgot password?
              </button>
            </div>

            <button type="submit" className={buttonPrimary} disabled={loading} aria-busy={loading}>{loading ? 'Signing in...' : 'Login'}</button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              <div className="text-sm text-neutral-500">or</div>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </div>

            <GoogleButton onClick={handleGoogleAuth}>Login with Google</GoogleButton>
          </form>
        ) : (
          <>
            {regStep === "enterEmail" && (
              <form key="reg-email" onSubmit={proceedToOtpStep} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Mail size={16} />
                  </span>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" className={inputClass} />
                </div>

                <button type="submit" className={buttonPrimary} disabled={loading}>{loading ? 'Please wait...' : 'Continue'}</button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  <div className="text-sm text-neutral-500">or</div>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                </div>

                <GoogleButton onClick={handleGoogleAuth}>Sign up with Google</GoogleButton>
              </form>
            )}

            {regStep === "otpSent" && (
              <RegisterWithOtp email={formData.email} onVerified={() => setRegStep("enterDetails")} onBack={() => setRegStep("enterEmail")} />
            )}

            {regStep === "enterDetails" && (
              <form key="reg-details" onSubmit={handleCompleteRegistration} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <User size={16} />
                  </span>
                  <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Full name" required autoComplete="name" className={inputClass} />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Smartphone size={16} />
                  </span>
                  <input id="mobile" name="mobile" type="tel" value={formData.mobile} onChange={handleChange} placeholder="9876543210" autoComplete="tel" className={inputClass} />
                </div>

                <div className="relative">
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                    <option value="">Select gender (optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <User size={16} />
                  </span>
                </div>

                <div className="relative">
                  <input id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputClass} />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={16} />
                  </span>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter password" required autoComplete="new-password" className={inputClass} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock size={16} />
                  </span>
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" required className={inputClass} />
                  <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" className={buttonPrimary} disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  <div className="text-sm text-neutral-500">or</div>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
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
