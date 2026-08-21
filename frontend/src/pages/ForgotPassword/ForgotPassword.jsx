import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPasswordRequest } from "@api/auth.api";
import { ArrowLeft, X, ShieldCheck, Sparkles } from "lucide-react";

const emailRegex = /^\S+@\S+\.\S+$/;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setError("Enter a valid email address.");
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
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 font-semibold text-[#079447] hover:underline"
            >
              
               <button
          type="button"
          onClick={() => navigate(-1)}
          className="
            absolute
            right-4
            top-4
            z-50
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

            sm:right-5
            sm:top-5
          "
          aria-label="Close"
        >
          <X size={19} />
        </button>
            </Link>
           
           
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f6faf7] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] text-[#4b5a50]">
              <ShieldCheck size={15} className="text-[#079447]" />
              We&apos;ll only use your email to help reset access.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                inputMode="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
              />
              <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">
                {error || " "}
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
