import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { apiErrorMessage } from "@api/axios";
import { resendVerificationEmail, verifyEmail } from "@services/auth.service";

const VerifyEmail = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState(location.state?.email || "");
  const [status, setStatus] = useState(token ? "verifying" : "waiting");

  const [message, setMessage] = useState(
    location.state?.registrationComplete
      ? "We sent an activation link to your email address."
      : "Enter your registration email to receive a new activation link.",
  );

  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;

    verifyEmail(token)
      .then((response) => {
        if (!active) return;

        setStatus("verified");
        setMessage(response.message || "Email verified successfully");
      })
      .catch((error) => {
        if (!active) return;

        setStatus("error");
        setMessage(
          apiErrorMessage(
            error,
            "The verification link is invalid or expired",
          ),
        );
      });

    return () => {
      active = false;
    };
  }, [token]);

  const resend = async (event) => {
    event.preventDefault();

    try {
      setResending(true);

      const response = await resendVerificationEmail(email);

      setStatus("waiting");
      setMessage(response.message);

      toast.success("Verification request accepted");
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "Could not resend verification email"),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="space-y-5 text-center sm:space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#079447] sm:text-sm sm:tracking-[0.18em]">
              Email verification
            </p>

            <h1 className="mt-2 text-2xl font-semibold leading-tight text-gray-900 sm:text-3xl">
              {status === "verified"
                ? "Account activated"
                : "Verify your email"}
            </h1>

            <p
              className={`mx-auto mt-3 max-w-sm text-sm leading-6 ${
                status === "error"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
              role="status"
            >
              {status === "verifying"
                ? "Checking your activation link…"
                : message}
            </p>
          </div>

          {/* Verified */}
          {status === "verified" ? (
            <Link
              to="/auth/login"
              className="block w-full rounded-xl bg-[#079447] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#057a3a] active:scale-[0.99] sm:py-3 sm:text-base"
            >
              Continue to sign in
            </Link>
          ) : (
            /* Resend form */
            <form
              onSubmit={resend}
              className="space-y-4 text-left"
            >
              <label className="block text-sm font-medium text-gray-700">
                Registration email

                <input
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value.toLowerCase())}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#079447] focus:ring-2 focus:ring-[#079447]/10 sm:py-3"
                />
              </label>

              <button
                type="submit"
                disabled={resending}
                className="w-full rounded-xl bg-[#079447] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#057a3a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:py-3 sm:text-base"
              >
                {resending
                  ? "Sending…"
                  : "Resend activation email"}
              </button>
            </form>
          )}

          {/* Login link */}
          <div className="pt-1 sm:pt-2">
            <Link
              to="/auth/login"
              className="inline-block px-2 py-2 text-sm font-semibold text-[#079447] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;