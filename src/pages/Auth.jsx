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
    // If user refreshes while in register details step, prefer preserved email from localStorage
    const saved = localStorage.getItem("reg_email");
    if (saved && !formData.email) {
      setFormData((s) => ({ ...s, email: saved }));
    }
    // placeholder for future side-effects
  }, []); // run once

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    if (!id) return; // defensive
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
        body: JSON.stringify({ email: (formData.email || "").trim(), password: formData.password }),
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
      // persist the email so it doesn't get lost between steps/components
      localStorage.setItem("reg_email", email);
      setFormData((s) => ({ ...s, email }));
    } catch (err) {
      console.error("check-email error:", err);
      return alert("Server error while checking email");
    } finally {
      setLoading(false);
    }

    setRegStep("otpSent");
  };

  // ------------------- REG: COMPLETE -------------------
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();

    // Basic client-side checks
    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match.");
    }

    // Ensure we have an email (try state first, then localStorage fallback)
    const email = (formData.email || "").trim().toLowerCase() || (localStorage.getItem("reg_email") || "").trim().toLowerCase();
    const name = (formData.name || "").trim();
    const password = formData.password;

    if (!name || !email || !password) {
      return alert("Please fill the required fields: name, email and password.");
    }

    setLoading(true);

    // Build payload with trimmed values
    const payload = {
      name,
      email,
      password,
      mobile: (formData.mobile || "").trim(),
      gender: formData.gender || "",
      dob: formData.dob || "",
    };

    // Debugging: show payload in console for troubleshooting (remove in production)
    console.debug("Register payload:", payload);

    try {
      const res = await fetch(buildUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      console.debug("Register response:", res.status, json);

      if (res.ok) {
        // If backend returns a token (our server issues token on register), auto-login
        if (json.token) {
          try {
            if (typeof onLoginSuccess === "function") onLoginSuccess(json.user, json.token);
          } catch (err) {
            console.warn("onLoginSuccess handler threw:", err);
          }
          // cleanup
          localStorage.removeItem("reg_email");
          setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "", gender: "", dob: "" });
          navigate("/account");
          return;
        }

        // fallback: if no token but success, notify user and switch to login
        alert("Registration successful — please login.");
        localStorage.removeItem("reg_email");
        switchToLogin();
        setFormData({ name: "", email: "", password: "", confirmPassword: "", mobile: "", gender: "", dob: "" });
      } else {
        // show backend message if present
        alert(json.message || "Registration failed");
      }
    } catch (err) {
      console.error("complete-registration error:", err);
      alert("Server error while registering");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // redirect to backend Google OAuth entrypoint
    window.location.href = buildUrl("/api/auth/google");
  };

  // Theme: strict black & white styling
  const inputClass =
    "w-full pl-12 pr-4 py-3 rounded-full bg-white dark:bg-black border border-black dark:border-white text-black dark:text-white placeholder-black/50 dark:placeholder-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black dark:focus-visible:ring-white transition";

  const primaryClasses = "w-full py-3 rounded-full font-semibold shadow-sm bg-black text-white hover:brightness-110 active:scale-[0.995] disabled:opacity-60";
  const googleBtnBase = "w-full flex items-center justify-center gap-3 py-2 px-3 rounded-full bg-white text-black border border-black shadow-sm hover:shadow-md transition dark:bg-black dark:text-white dark:border-white";

  const motionBtnProps = {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.985 },
    transition: { type: "spring", stiffness: 400, damping: 28 },
  };

  const GoogleIcon = () => (
    // Multicolor Google "G" icon (inline SVG)
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 33 30 36 24 36c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 11.9 1 2 10.9 2 23s9.9 22 22 22c11 0 21-8 21-22 0-1.5-.2-2.6-.4-3z"/>
      <path fill="#FF3D00" d="M6.3 14.7l7.3 5.3C15.3 16.1 19.2 13 24 13c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 16.1 1 9 6.8 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 47c5.6 0 10.6-1.9 14.4-5.1l-6.7-5.4C30.9 37.7 27.8 39 24 39c-6 0-10.9-3.8-12.8-9.2l-7.4 5.7C7.9 41.8 15.3 47 24 47z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.1 5.6-5.7 7.3 0 0 9.9-7 13-13.8 0 0 .3-1.3.3-1.4z"/>
    </svg>
  );

  const GoogleButton = ({ children, onClick }) => (
    <motion.button
      {...motionBtnProps}
      type="button"
      onClick={onClick}
      aria-label={`${children}`}
      className={googleBtnBase}
    >
      <GoogleIcon />
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

            <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading} aria-busy={loading}>
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

                {/* Restyled Continue button */}
                <motion.button
                  {...motionBtnProps}
                  type="submit"
                  className={primaryClasses}
                  disabled={loading}
                >
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
                    <option value="">Select Gender</option>
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

                <motion.button {...motionBtnProps} type="submit" className={primaryClasses} disabled={loading}>
                  {loading ? 'Creating...' : 'Create account'}
                </motion.button>

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
