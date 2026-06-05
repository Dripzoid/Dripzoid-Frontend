import { useState, useEffect, useContext } from "react";

import { motion } from "framer-motion";

import { useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Smartphone,
  CheckCircle,
} from "lucide-react";

import RegisterWithOtp from "./RegisterWithOtp";

import { UserContext } from "../contexts/UserContext";

const API_BASE = (process.env.REACT_APP_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${API_BASE}${path}`;
}

export default function Auth() {
  const navigate = useNavigate();
  const { refresh, login } = useContext(UserContext);

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo");

  /* ======================================================
     STATE
  ====================================================== */

  const [isLogin, setIsLogin] = useState(true);

  const [regStep, setRegStep] = useState("enterEmail");
  const [regOtpVerified, setRegOtpVerified] = useState(false);

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

  const [oauthLoading, setOauthLoading] = useState(false);

  const [forgotFlow, setForgotFlow] = useState(false);

  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);

  /* ======================================================
     CHECK AUTH ON LOAD
  ====================================================== */

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await refresh();

        if (result?.user) {
          if (returnTo) {
            window.location.href = decodeURIComponent(returnTo);
          } else {
            navigate("/", {
              replace: true,
            });
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    checkAuth();
  }, [navigate, refresh, returnTo]);

  /* ======================================================
     LOAD SAVED EMAIL
  ====================================================== */

  useEffect(() => {
    const saved = localStorage.getItem("reg_email");

    if (saved && !formData.email) {
      setFormData((s) => ({
        ...s,
        email: saved,
      }));
    }
  }, [formData.email]);

  /* ======================================================
     INPUT CLASSES
  ====================================================== */

  const inputClass =
    "w-full pl-12 pr-4 py-3 rounded-full text-black bg-white border border-black placeholder-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black transition dark:text-white dark:bg-black dark:border-white dark:placeholder-white/50 dark:focus-visible:ring-white";

  const primaryClasses =
    "w-full py-3 rounded-full font-semibold shadow-sm bg-black text-white hover:brightness-110 active:scale-[0.995] disabled:opacity-60 dark:bg-white dark:text-black dark:border dark:border-white";

  const secondaryClasses =
    "w-full py-3 rounded-full font-semibold border border-black/15 text-black hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/5";

  const toggleButtonBase =
    "flex-1 py-2.5 text-sm font-semibold rounded-full transition";

  const googleBtnBase =
    "w-full flex items-center justify-center gap-3 py-2 px-3 rounded-full border border-black shadow-sm transition bg-white text-black dark:bg-black dark:text-white dark:border-white";

  const motionBtnProps = {
    whileHover: {
      scale: 1.02,
    },
    whileTap: {
      scale: 0.985,
    },
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 28,
    },
  };

  /* ======================================================
     GOOGLE ICON
  ====================================================== */

  const GoogleIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C34.7 33 30 36 24 36c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 11.9 1 2 10.9 2 23s9.9 22 22 22c11 0 21-8 21-22 0-1.5-.2-2.6-.4-3z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l7.3 5.3C15.3 16.1 19.2 13 24 13c3.6 0 6.9 1.3 9.4 3.6l6.6-6.6C34.6 2.9 29.6 1 24 1 16.1 1 9 6.8 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 47c5.6 0 10.6-1.9 14.4-5.1l-6.7-5.4C30.9 37.7 27.8 39 24 39c-6 0-10.9-3.8-12.8-9.2l-7.4 5.7C7.9 41.8 15.3 47 24 47z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.1 5.6-5.7 7.3"
      />
    </svg>
  );

  /* ======================================================
     GOOGLE BUTTON
  ====================================================== */

  const GoogleButton = ({ children, onClick }) => (
    <motion.button
      {...motionBtnProps}
      type="button"
      onClick={onClick}
      className={googleBtnBase}
    >
      <GoogleIcon />
      <span className="text-sm font-medium">{children}</span>
    </motion.button>
  );

  /* ======================================================
     HANDLE INPUT
  ====================================================== */

  const handleChange = (e) => {
    const { id, value } = e.target;

    setFormData((s) => ({
      ...s,
      [id]: value,
    }));
  };

  /* ======================================================
     LOGIN
  ====================================================== */

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch(buildUrl("/api/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      await login(data.user);

      if (returnTo) {
        window.location.href = decodeURIComponent(returnTo);
      } else {
        navigate("/", {
          replace: true,
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     REGISTER EMAIL CHECK
  ====================================================== */

  const handleContinueToOtp = async (e) => {
    e?.preventDefault?.();

    const email = (formData.email || "").trim().toLowerCase();

    if (!email) {
      return alert("Enter an email");
    }

    setLoading(true);

    try {
      const res = await fetch(buildUrl("/api/auth/check-email"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const json = await res.json();

      if (json.exists) {
        alert("Email already registered");
        setIsLogin(true);
        return;
      }

      localStorage.setItem("reg_email", email);
      setRegStep("otpSent");
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     COMPLETE REGISTER
  ====================================================== */

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match");
    }

    setLoading(true);

    try {
      const res = await fetch(buildUrl("/api/auth/register"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          mobile: formData.mobile,
          gender: formData.gender,
          dob: formData.dob,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      localStorage.removeItem("reg_email");

      await login(data.user);

      if (returnTo) {
        window.location.href = decodeURIComponent(returnTo);
      } else {
        navigate("/", {
          replace: true,
        });
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     RESET PASSWORD
  ====================================================== */

  const handleResetPassword = async () => {
    const email = (formData.email || "").trim();
    const password = formData.password;
    const confirm = formData.confirmPassword;

    if (!email) {
      return alert("Enter your email first");
    }

    if (password !== confirm) {
      return alert("Passwords do not match");
    }

    setLoading(true);

    try {
      const res = await fetch(buildUrl("/api/auth/reset-password"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Reset failed");
      }

      alert("Password reset successful");

      setForgotFlow(false);
      setForgotOtpVerified(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setFormData((s) => ({
        ...s,
        password: "",
        confirmPassword: "",
      }));
    } catch (err) {
      console.error(err);
      alert(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     GOOGLE AUTH
  ====================================================== */

  const handleGoogleAuth = () => {
    const currentUrl = encodeURIComponent(returnTo || window.location.origin);

    window.location.href = `${buildUrl("/api/auth/google")}?returnTo=${currentUrl}`;
  };

  /* ======================================================
     OAUTH CHECK
  ====================================================== */

  useEffect(() => {
    const handleOAuth = async () => {
      try {
        setOauthLoading(true);

        const result = await refresh();

        if (result?.user) {
          await login(result.user);

          if (returnTo) {
            window.location.href = decodeURIComponent(returnTo);
          } else {
            navigate("/", {
              replace: true,
            });
          }
        }
      } catch (err) {
        console.error("OAuth failed:", err);
      } finally {
        setOauthLoading(false);
      }
    };

    handleOAuth();
  }, [navigate, refresh, login, returnTo]);

  /* ======================================================
     HELPERS
  ====================================================== */

  const resetToLogin = () => {
    setIsLogin(true);
    setForgotFlow(false);
    setForgotOtpVerified(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const resetToRegister = () => {
    setIsLogin(false);
    setForgotFlow(false);
    setForgotOtpVerified(false);
    setRegStep("enterEmail");
    setRegOtpVerified(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  /* ======================================================
     LOADING
  ====================================================== */

  if (oauthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  /* ======================================================
     UI
  ====================================================== */

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="w-full max-w-md p-8 rounded-2xl bg-white dark:bg-black border border-black/10 dark:border-white/10 shadow-2xl"
      >
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 rounded-lg bg-black dark:bg-white text-white dark:text-black">
            <CheckCircle size={20} />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">
              {isLogin
                ? forgotFlow
                  ? "Reset your password"
                  : "Welcome back"
                : "Create your account"}
            </h2>

            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isLogin
                ? forgotFlow
                  ? "Verify your email to continue"
                  : "Sign in to continue"
                : "Register with email OTP or Google"}
            </p>
          </div>
        </div>

        {/* LOGIN / REGISTER TOGGLE */}

        <div className="flex gap-2 p-1 rounded-full border border-black/10 dark:border-white/10 mb-5">
          <button
            type="button"
            onClick={resetToLogin}
            className={`${toggleButtonBase} ${
              isLogin
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={resetToRegister}
            className={`${toggleButtonBase} ${
              !isLogin
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/60 dark:text-white/60"
            }`}
          >
            Register
          </button>
        </div>

        {/* LOGIN */}

        {isLogin && !forgotFlow && (
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                <Mail size={16} />
              </span>

              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2">
                <Lock size={16} />
              </span>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
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

            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => {
                  setForgotFlow(true);
                  setForgotOtpVerified(false);
                }}
                className="text-sm text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button
              {...motionBtnProps}
              type="submit"
              className={primaryClasses}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </motion.button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              <div className="text-sm text-black/50 dark:text-white/50">
                or
              </div>
              <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
            </div>

            <GoogleButton onClick={handleGoogleAuth}>
              Continue with Google
            </GoogleButton>
          </form>
        )}

        {/* FORGOT PASSWORD FLOW */}

        {isLogin && forgotFlow && (
          <div className="flex flex-col gap-4">
            {!forgotOtpVerified ? (
              <>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail size={16} />
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={inputClass}
                  />
                </div>

                <RegisterWithOtp
                  email={formData.email}
                  mode="forgot-password"
                  onVerified={() => setForgotOtpVerified(true)}
                />

                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-sm text-center text-black/70 dark:text-white/70 hover:underline"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock size={16} />
                  </span>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="New Password"
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

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock size={16} />
                  </span>

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm New Password"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>

                <motion.button
                  {...motionBtnProps}
                  type="button"
                  onClick={handleResetPassword}
                  className={primaryClasses}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Reset Password"}
                </motion.button>

                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-sm text-center text-black/70 dark:text-white/70 hover:underline"
                >
                  Back to Login
                </button>
              </>
            )}
          </div>
        )}

        {/* REGISTER FLOW */}

        {!isLogin && !forgotFlow && (
          <div className="flex flex-col gap-4">
            {regStep === "enterEmail" && (
              <>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail size={16} />
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                <motion.button
                  {...motionBtnProps}
                  type="button"
                  onClick={handleContinueToOtp}
                  className={primaryClasses}
                  disabled={loading}
                >
                  {loading ? "Checking..." : "Continue to OTP"}
                </motion.button>

                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-sm text-center text-black/70 dark:text-white/70 hover:underline"
                >
                  Back to Login
                </button>
              </>
            )}

            {regStep === "otpSent" && !regOtpVerified && (
              <>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                    Verify the OTP sent to{" "}
                    <span className="font-medium text-black dark:text-white">
                      {formData.email}
                    </span>
                  </p>

                  <RegisterWithOtp
                    email={formData.email}
                    mode="register"
                    onVerified={() => {
                      setRegOtpVerified(true);
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRegStep("enterEmail");
                    setRegOtpVerified(false);
                  }}
                  className="text-sm text-center text-black/70 dark:text-white/70 hover:underline"
                >
                  Change Email
                </button>
              </>
            )}

            {regStep === "otpSent" && regOtpVerified && (
              <form
                onSubmit={handleCompleteRegistration}
                className="flex flex-col gap-4"
              >
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <User size={16} />
                  </span>

                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className={inputClass}
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Mail size={16} />
                  </span>

                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className={inputClass}
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Smartphone size={16} />
                  </span>

                  <input
                    id="mobile"
                    type="text"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="Mobile Number"
                    className={inputClass}
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock size={16} />
                  </span>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
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

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Lock size={16} />
                  </span>

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>

                <motion.button
                  {...motionBtnProps}
                  type="submit"
                  className={primaryClasses}
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </motion.button>

                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-sm text-center text-black/70 dark:text-white/70 hover:underline"
                >
                  Back to Login
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
