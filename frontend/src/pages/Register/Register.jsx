import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/auth.service";

const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Enter your name.";
    if (!form.email.trim()) nextErrors.email = "Enter your email.";
    else if (!emailRegex.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!form.phone.trim()) nextErrors.phone = "Enter your phone number.";
    else if (!phoneRegex.test(form.phone.trim())) nextErrors.phone = "Enter a valid phone number.";
    if (!form.password.trim()) nextErrors.password = "Enter a password.";
    else if (!strongPasswordRegex.test(form.password)) {
      nextErrors.password = "Use 8+ characters with upper, lower, number, and symbol.";
    }

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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
            />
            <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">{errors.name || " "}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                inputMode="email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
              />
              <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">{errors.email || " "}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Mobile number"
                inputMode="tel"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
              />
              <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">{errors.phone || " "}</p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a password"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
            />
            <p className="mt-0.5 min-h-4 text-[11px] leading-4 text-red-600">{errors.password || " "}</p>
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
