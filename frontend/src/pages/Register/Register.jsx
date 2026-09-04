import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/auth.service";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value || !value.trim()) return "Enter your name.";
        if (value.trim().length < 2) return "Name must be at least 2 characters.";
        return "";
      case "email":
        if (!value || !value.trim()) return "Enter your email.";
        if (!emailRegex.test(value.trim())) return "Enter a valid email address.";
        return "";
      case "phone":
        if (!value || !value.trim()) return "Enter your phone number.";
        if (!phoneRegex.test(value.trim())) return "Enter a valid phone number.";
        return "";
      case "password":
        if (!value) return "Enter a password.";
        if (value.length < 12) return "Password must be at least 12 characters.";
        if (!strongPasswordRegex.test(value)) {
          return "Use 12+ characters with upper, lower, number, and symbol.";
        }
        return "";
      default:
        return "";
    }
  };

  const passwordCriteria = {
    length: form.password.length >= 12,
    hasUpper: /[A-Z]/.test(form.password),
    hasLower: /[a-z]/.test(form.password),
    hasNumber: /\d/.test(form.password),
    hasSymbol: /[^A-Za-z0-9]/.test(form.password),
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    let val = value;
    if ((name === "email" || type === "email") && typeof val === "string") {
      val = val.toLowerCase();
    }
    const nextForm = { ...form, [name]: val };
    setForm(nextForm);

    if (errors.form) {
      setErrors((prev) => ({ ...prev, form: "" }));
    }

    if (touched[name]) {
      const err = validateField(name, val);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const fieldsToValidate = ["name", "email", "phone", "password"];
    const nextErrors = {};
    const nextTouched = {};

    fieldsToValidate.forEach((field) => {
      nextTouched[field] = true;
      const err = validateField(field, form[field]);
      if (err) nextErrors[field] = err;
    });

    setTouched(nextTouched);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setLoading(true);
      await registerUser(form);
      navigate("/auth/login");
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: error.response?.data?.message || "Registration failed",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-10">
      <div className="mx-auto max-w-[520px] rounded-[28px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#079447]">
          Create account
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">
          Register
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Create your account to place orders and save your details.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-2">
          <div>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Full name"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              className={`w-full rounded-xl border ${
                errors.name
                  ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                  : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
              } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
            />
            <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
              {errors.name && (
                <>
                  <AlertCircle size={12} className="shrink-0 text-red-600" />
                  <span>{errors.name}</span>
                </>
              )}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Email address (you@example.com)"
                maxLength={100}
                inputMode="email"
                aria-invalid={Boolean(errors.email)}
                className={`w-full rounded-xl border ${
                  errors.email
                    ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                    : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
              />
              <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                {errors.email && (
                  <>
                    <AlertCircle size={12} className="shrink-0 text-red-600" />
                    <span>{errors.email}</span>
                  </>
                )}
              </p>
            </div>
            <div>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Mobile number"
                maxLength={15}
                inputMode="tel"
                aria-invalid={Boolean(errors.phone)}
                className={`w-full rounded-xl border ${
                  errors.phone
                    ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                    : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                } px-3.5 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400`}
              />
              <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                {errors.phone && (
                  <>
                    <AlertCircle size={12} className="shrink-0 text-red-600" />
                    <span>{errors.phone}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Create a password"
                maxLength={128}
                aria-invalid={Boolean(errors.password)}
                className={`w-full rounded-xl border ${
                  errors.password
                    ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                    : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                } px-3.5 py-2.5 pr-11 text-sm outline-none transition-all placeholder:text-gray-400`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#079447]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
              {errors.password && (
                <>
                  <AlertCircle size={12} className="shrink-0 text-red-600" />
                  <span>{errors.password}</span>
                </>
              )}
            </p>
            {(form.password || touched.password) && (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                <span className={passwordCriteria.length ? "text-emerald-600 font-medium" : "text-gray-400"}>
                  {passwordCriteria.length ? "✓" : "•"} 12+ chars
                </span>
                <span className={(passwordCriteria.hasUpper && passwordCriteria.hasLower) ? "text-emerald-600 font-medium" : "text-gray-400"}>
                  {(passwordCriteria.hasUpper && passwordCriteria.hasLower) ? "✓" : "•"} Upper & Lower
                </span>
                <span className={passwordCriteria.hasNumber ? "text-emerald-600 font-medium" : "text-gray-400"}>
                  {passwordCriteria.hasNumber ? "✓" : "•"} Number
                </span>
                <span className={passwordCriteria.hasSymbol ? "text-emerald-600 font-medium" : "text-gray-400"}>
                  {passwordCriteria.hasSymbol ? "✓" : "•"} Symbol
                </span>
              </div>
            )}
          </div>

          {errors.form ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.form}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-[#079447] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#06753a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/auth/login" className="font-semibold text-[#079447] hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Register;
