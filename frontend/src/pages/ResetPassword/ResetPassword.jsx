import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  X,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  KeyRound,
} from "lucide-react";
import toast from "react-hot-toast";

import { apiErrorMessage } from "@api/axios";
import { resetPassword } from "@services/auth.service";
import TinyLeaf from "@assets/images/tinyleaf.svg";
import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenFromUrl = searchParams.get("token") || searchParams.get("code") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordCriteria = {
    length: password.length >= 12,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  const validateField = (name, value, allData) => {
    switch (name) {
      case "email":
        if (!value || !value.trim()) return "Enter your email address.";
        if (!/^\S+@\S+\.\S+$/.test(value.trim())) return "Enter a valid email address.";
        return "";
      case "password":
        if (!value) return "Please enter a new password.";
        if (value.length < 12) return "Password must be at least 12 characters.";
        if (!strongPasswordRegex.test(value)) {
          return "Password must include upper, lower, number, and symbol.";
        }
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your new password.";
        if (value !== allData.password) return "Passwords do not match.";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value, { email, password, confirmPassword });
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "email") val = val.toLowerCase();

    const nextData = {
      email: name === "email" ? val : email,
      password: name === "password" ? val : password,
      confirmPassword: name === "confirmPassword" ? val : confirmPassword,
    };

    if (name === "email") setEmail(val);
    if (name === "password") setPassword(val);
    if (name === "confirmPassword") setConfirmPassword(val);

    if (serverError) setServerError("");

    if (touched[name]) {
      const err = validateField(name, val, nextData);
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }

    if (name === "password" && touched.confirmPassword) {
      const confirmErr = validateField("confirmPassword", nextData.confirmPassword, nextData);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = {};
    const touchedState = { password: true, confirmPassword: true };
    if (!emailFromUrl) touchedState.email = true;

    if (!emailFromUrl) {
      const emailErr = validateField("email", email, { email, password, confirmPassword });
      if (emailErr) errors.email = emailErr;
    }

    const passErr = validateField("password", password, { email, password, confirmPassword });
    if (passErr) errors.password = passErr;

    const confirmErr = validateField("confirmPassword", confirmPassword, {
      email,
      password,
      confirmPassword,
    });
    if (confirmErr) errors.confirmPassword = confirmErr;

    setTouched(touchedState);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    if (!tokenFromUrl) {
      setServerError("Reset token is missing from the link. Please check your reset email.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        token: tokenFromUrl,
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      });

      setIsSuccess(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      const msg = apiErrorMessage(
        err,
        "Failed to reset password. The link may be invalid or expired."
      );
      setServerError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-md">
      <div className="relative my-auto w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_25px_80px_rgba(0,0,0,0.22)] sm:rounded-[32px]">
        {/* Background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#079447]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#079447]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8">
          {/* Top Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#079447]">
                  Account security
                </p>
                <img src={TinyLeaf} alt="" aria-hidden="true" className="w-4" />
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                {isSuccess ? "Password Reset" : "Reset Your Password"}
              </h1>
              <p className="mt-2 max-w-[420px] text-sm leading-6 text-gray-500">
                {isSuccess
                  ? "Your password has been successfully updated. You can now log in with your new credentials."
                  : "Please enter a strong new password for your account below."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 shadow-sm transition-all duration-300 hover:bg-[#079447] hover:text-white"
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>

          {/* Missing Token Warning */}
          {!tokenFromUrl && !isSuccess && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Missing Reset Token</p>
                <p className="mt-1 leading-5">
                  The password reset link appears incomplete. Please click the link directly from your reset email or request a new reset link.
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {isSuccess ? (
            <div className="space-y-6 py-2 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-[#079447]">
                <CheckCircle2 size={36} />
              </div>

              <div className="rounded-2xl bg-[#f6faf7] p-4 text-center text-sm text-[#4b5a50]">
                <p className="font-medium text-gray-900">All Set!</p>
                <p className="mt-1 text-xs text-gray-600">
                  Your password has been reset securely. You can now access your account with your new password.
                </p>
              </div>

              <Link
                to="/auth/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#079447] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#06753a] active:scale-[0.99]"
              >
                Proceed to Sign In
              </Link>
            </div>
          ) : (
            /* Reset Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Server Error Alert */}
              {serverError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-600">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="leading-5">{serverError}</span>
                </div>
              )}

              {/* Email (If not provided in URL) */}
              {!emailFromUrl && (
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-700">
                    Account Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your email address"
                    className={`mt-1.5 w-full rounded-xl border ${
                      fieldErrors.email
                        ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500/10"
                        : "border-gray-200 bg-gray-50 focus:border-[#079447] focus:ring-[#079447]/10"
                    } px-3.5 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-4 placeholder:text-gray-400`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>
              )}

              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700">
                  New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter new password"
                    className={`w-full rounded-xl border ${
                      fieldErrors.password
                        ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500/10"
                        : "border-gray-200 bg-gray-50 focus:border-[#079447] focus:ring-[#079447]/10"
                    } px-3.5 py-2.5 pr-10 text-sm outline-none transition-all focus:bg-white focus:ring-4 placeholder:text-gray-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}

                {/* Password Criteria checklist */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 rounded-xl bg-gray-50 p-3 text-[11px] text-gray-500 sm:grid-cols-2">
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordCriteria.length ? "font-medium text-[#079447]" : "text-gray-400"
                    }`}
                  >
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>At least 12 characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordCriteria.hasUpper ? "font-medium text-[#079447]" : "text-gray-400"
                    }`}
                  >
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Uppercase letter (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordCriteria.hasLower ? "font-medium text-[#079447]" : "text-gray-400"
                    }`}
                  >
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Lowercase letter (a-z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      passwordCriteria.hasNumber && passwordCriteria.hasSymbol
                        ? "font-medium text-[#079447]"
                        : "text-gray-400"
                    }`}
                  >
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span>Number & Symbol</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Confirm New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Confirm new password"
                    className={`w-full rounded-xl border ${
                      fieldErrors.confirmPassword
                        ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500/10"
                        : "border-gray-200 bg-gray-50 focus:border-[#079447] focus:ring-[#079447]/10"
                    } px-3.5 py-2.5 pr-10 text-sm outline-none transition-all focus:bg-white focus:ring-4 placeholder:text-gray-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>

              {/* Security info box */}
              <div className="rounded-xl bg-[#f6faf7] px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-[#4b5a50]">
                  <ShieldCheck size={15} className="shrink-0 text-[#079447]" />
                  <span>Passwords are encrypted and stored securely.</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !tokenFromUrl}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#079447] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#06753a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span>Updating password...</span>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer links */}
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 font-semibold text-[#079447] hover:underline"
            >
              <ArrowLeft size={14} />
              Back to login
            </Link>

            <Link
              to="/auth/forgot-password"
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 hover:underline"
            >
              Need a new reset link?
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
