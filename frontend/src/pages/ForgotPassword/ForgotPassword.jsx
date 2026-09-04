import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPasswordRequest } from "@api/auth.api";
import { ArrowLeft, X, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

const emailRegex = /^\S+@\S+\.\S+$/;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (val) => {
    if (!val || !val.trim()) return "Enter your email address.";
    if (!emailRegex.test(val.trim())) return "Enter a valid email address.";
    return "";
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleChange = (e) => {
    let val = e.target.value;
    if (typeof val === "string") {
      val = val.toLowerCase();
    }
    setEmail(val);
    if (message) setMessage("");
    if (touched) {
      setError(validateEmail(val));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setTouched(true);

    const err = validateEmail(email);
    if (err) {
      setError(err);
      return;
    }

    try {
      setLoading(true);
      await forgotPasswordRequest(email.trim());
      setMessage("If the email exists, we sent a reset link.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not send reset email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/50 px-4 py-6 backdrop-blur-md">
      <div className="absolute inset-0" />

      <section className="relative w-full max-w-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_25px_80px_rgba(0,0,0,0.22)] sm:rounded-[32px]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#079447]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#079447]/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#079447]">
                Account help
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                Forgot password
              </h1>
              <p className="mt-2 max-w-[420px] text-sm leading-6 text-gray-500">
                Enter the email address linked to your account and we&apos;ll send
                password reset instructions.
              </p>
            </div>

            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#edf8f1] text-[#079447] sm:grid">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-white/80
                  text-gray-500
                  shadow-sm
                  backdrop-blur
                  transition-all
                  duration-300
                  hover:bg-[#079447]
                  hover:text-white
                "
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f6faf7] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] text-[#4b5a50]">
              <ShieldCheck size={15} className="text-[#079447]" />
              We&apos;ll only use your email to help reset access.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                id="email"
                type="text"
                value={email}
                onChange={handleChange}
                onBlur={handleBlur}
                inputMode="email"
                placeholder="Enter your email address"
                maxLength={100}
                aria-invalid={Boolean(error)}
                className={`w-full rounded-xl border ${
                  error
                    ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                    : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
              />
              <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                {error && (
                  <>
                    <AlertCircle size={12} className="shrink-0 text-red-600" />
                    <span>{error}</span>
                  </>
                )}
              </p>
            </div>

            {message ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#079447] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#06753a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 font-semibold text-[#079447] hover:underline"
            >
              <ArrowLeft size={15} />
              Back to login
            </Link>

            <div className="inline-flex items-center gap-2 text-[11px] text-gray-400">
              <Sparkles size={14} className="text-[#079447]" />
              Reset help is secure
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
