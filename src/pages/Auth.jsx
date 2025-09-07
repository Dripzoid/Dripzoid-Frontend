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

  // Theme: strict black & white styling
  const inputClass =
    "w-full pl-12 pr-4 py-3 rounded-full bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white placeholder-black/50 dark:placeholder-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/white transition";

  const primaryClasses = "w-full py-3 rounded-full font-semibold shadow-sm";
  const loginBtnClass = "bg-black text-white hover:brightness-110 active:scale-[0.995] disabled:opacity-60";
  const signupBtnClass = "bg-black text-white hover:brightness-110 active:scale-[0.995] disabled:opacity-60";
  const googleBtnBase = "w-full flex items-center justify-center gap-3 py-2 px-3 rounded-full bg-white text-black border border-black shadow-sm hover:shadow-md transition dark:bg-black dark:text-white dark:border-white";

  const motionBtnProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.985 },
    transition: { type: "spring", stiffness: 400, damping: 28 },
  };

  const GoogleButton = ({ children, onClick }) => (
    <motion.button
      {...motionBtnProps}
      type="button"
      onClick={onClick}
      aria-label={`${children}`}
      className={googleBtnBase}
    >
      {/* monochrome Google G - rendered as a bold G in a small circle */}
      <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="Arial, Helvetica, sans-serif">G</text>
      </svg>
      <span className="text-sm font-medium">{children}</span>
    </motion.button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full max-w-md p-8 md:p-10 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-lg bg-black text-white">
            <CheckCircle size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">{isLogin ? "Welcome back" : "Create your account"}</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{isLogin ? "Sign in to continue" : "Register with email OTP or Google"}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <button type="button" onClick={switchToLogin} className={isLogin ? "px-5 py-2 rounded-full bg-black text-white text-sm font-medium" : "px-5 py-2 rounded-full text-sm font-medium bg-transparent text-black dark:text-white"}>
            Login
          </button>
          <button type="button" onClick={switchToRegister} className={!isLogin ? "px-5 py-2 rounded-full bg-black text-white text-sm font-medium" : "px-5 py-2 rounded-full text-sm font-medium bg-transparent text-black dark:text-white"}>
            Register
          </button>
        </div>

        {isLogin ? (
          <form key="login" onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                <Mail size={16} />
              </span>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" className={inputClass} />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                <Lock size={16} />
              </span>
              <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter password" required autoComplete="current-password" className={inputClass} />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div />
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm underline text-black/60 dark:text-white/60 underline-offset-2">
                Forgot password?
              </button>
            </div>

            <motion.button {...motionBtnProps} type="submit" className={`${primaryClasses} ${loginBtnClass}`} disabled={loading} aria-busy={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </motion.button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              <div className="text-sm text-black/50 dark:text-white/50">or</div>
              <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
            </div>

            <GoogleButton onClick={handleGoogleAuth}>Login with Google</GoogleButton>
          </form>
        ) : (
          <>
            {regStep === "enterEmail" && (
              <form key="reg-email" onSubmit={proceedToOtpStep} className="flex flex-col gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <Mail size={16} />
                  </span>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required autoComplete="email" className={inputClass} />
                </div>

                <motion.button {...motionBtnProps} type="submit" className={`${primaryClasses} ${signupBtnClass}`} disabled={loading}>
                  {loading ? 'Please wait...' : 'Continue'}
                </motion.button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                  <div className="text-sm text-black/50 dark:text-white/50">or</div>
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <User size={16} />
                  </span>
                  <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Full name" required autoComplete="name" className={inputClass} />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <User size={16} />
                  </span>
                </div>

                <div className="relative">
                  <input id="dob" name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputClass} />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <Lock size={16} />
                  </span>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Enter password" required autoComplete="new-password" className={inputClass} />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40">
                    <Lock size={16} />
                  </span>
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm password" required className={inputClass} />
                  <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <motion.button {...motionBtnProps} type="submit" className={`${primaryClasses} ${signupBtnClass}`} disabled={loading}>{loading ? 'Creating...' : 'Create account'}</motion.button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                  <div className="text-sm text-black/50 dark:text-white/50">or</div>
                  <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
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
