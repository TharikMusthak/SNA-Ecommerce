import { useState } from "react";
import { api } from "../api";
import "../Login.css";

export default function Login({ onLogin, initialMessage = "" }) {
  const resetToken =
    new URLSearchParams(window.location.search).get("token") || "";

  const savedEmail = localStorage.getItem("sna_admin_email") || "";

  const [mode, setMode] = useState(resetToken ? "reset" : "login");
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(savedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "forgot") {
        const data = await api("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });

        setMessage(data.message);
        return;
      }

      if (mode === "reset") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        const data = await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            password,
          }),
        });

        setMessage(data.message);

        window.history.replaceState(
          {},
          "",
          import.meta.env.BASE_URL,
        );

        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (remember) {
        localStorage.setItem("sna_admin_email", email);
      } else {
        localStorage.removeItem("sna_admin_email");
      }

      onLogin(data.admin);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "forgot"
      ? "Forgot password"
      : mode === "reset"
        ? "Create new password"
        : "Admin Login";

  const description =
    mode === "forgot"
      ? "Enter your admin email to receive a secure reset link."
      : mode === "reset"
        ? "Create a strong new password for your admin account."
        : "Sign in to continue managing SNA.";

  return (
    <div className="sna-login-page">
      <aside className="sna-welcome-panel">
        <div className="sna-pattern" />

        <div className="sna-floating-leaves" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <span className="sna-leaf" key={index} />
          ))}
        </div>

        <div className="sna-ring sna-ring-one" />
        <div className="sna-ring sna-ring-two" />
        <div className="sna-ring sna-ring-three" />

        <div className="sna-welcome-content">
          <div className="sna-brand">
            <div className="sna-brand-mark">S</div>
            <span>SNA</span>
          </div>

          <div className="sna-welcome-copy">
            <h1>Welcome to SNA Admin Panel</h1>
          </div>

          <div className="sna-features">
            <Feature
              icon={<ProductIcon />}
              text="Food product and category management"
            />

            <Feature
              icon={<BannerIcon />}
              text="Inventory and stock tracking"
            />

            <Feature
              icon={<SecurityIcon />}
              text="Orders, banners and website content"
            />
          </div>

          <p className="sna-welcome-footer">
            Smart content management for SNA.
          </p>
        </div>
      </aside>

      <main className="sna-form-panel">
        <div className="sna-mobile-brand">
          <div className="sna-brand-mark">S</div>
          <span>SNA FOOD STUDIO</span>
        </div>

        <form
          className="sna-login-card"
          noValidate
          onSubmit={submit}
          aria-busy={loading}
        >
          <span className="card-corner corner-top-left" />
          <span className="card-corner corner-top-right" />
          <span className="card-corner corner-bottom-left" />
          <span className="card-corner corner-bottom-right" />

          <div className="sna-form-header">
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          {error && (
            <div className="sna-alert sna-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="sna-alert sna-success" role="status">
              {message}
            </div>
          )}

          {mode !== "reset" && (
            <label className="sna-field">
              <span>Email address</span>

              <div className="sna-input-wrapper">
                <MailIcon />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address"
                  autoComplete="username"
                  required
                />
              </div>
            </label>
          )}

          {mode !== "forgot" && (
            <label className="sna-field">
              <span>
                {mode === "reset" ? "New password" : "Password"}
              </span>

              <div className="sna-input-wrapper">
                <LockIcon />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === "reset"
                      ? "Enter new password"
                      : "Enter password"
                  }
                  autoComplete={
                    mode === "reset"
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={mode === "reset" ? 12 : undefined}
                  maxLength={72}
                  required
                />

                <button
                  className="sna-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </div>
            </label>
          )}

          {mode === "reset" && (
            <label className="sna-field">
              <span>Confirm new password</span>

              <div className="sna-input-wrapper">
                <LockIcon />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={72}
                  required
                />

                <button
                  className="sna-password-toggle"
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <EyeIcon hidden={showConfirmPassword} />
                </button>
              </div>
            </label>
          )}

          {mode === "login" && (
            <div className="sna-login-options">
              <label className="sna-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) =>
                    setRemember(event.target.checked)
                  }
                />
                <span>Remember me</span>
              </label>

              <button
                className="sna-text-button"
                type="button"
                onClick={() => changeMode("forgot")}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            className="sna-submit-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "forgot"
                ? "Send reset link"
                : mode === "reset"
                  ? "Reset password"
                  : "Log In"}
          </button>

          {mode === "forgot" && (
            <button
              className="sna-back-button"
              type="button"
              onClick={() => changeMode("login")}
            >
              ← Back to login
            </button>
          )}
        </form>

        <p className="sna-copyright">
          © {new Date().getFullYear()} Designed & Developed by Hint Technologies.
        </p>
      </main>
    </div>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="sna-feature">
      <div className="sna-feature-icon">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function BannerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h16v11H4z" />
      <path d="m6.5 15 3.5-3.5 2.7 2.7 2.2-2.2 2.6 3" />
      <circle cx="16.5" cy="9.5" r="1.3" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5.5 6v5c0 4.3 2.7 8.1 6.5 10 3.8-1.9 6.5-5.7 6.5-10V6z" />
      <path d="m9.3 12 1.8 1.8 3.8-4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      className="sna-input-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="sna-input-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />

      {hidden && <path d="m4 4 16 16" />}
    </svg>
  );
}
