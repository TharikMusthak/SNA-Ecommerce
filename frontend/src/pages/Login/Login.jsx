import { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/AuthProvider";
import TinyLeaf from "@assets/images/tinyleaf.svg";
import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";
import { useNavigate } from "react-router-dom";

const emailRegex = /^\S+@\S+\.\S+$/;
const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

const AuthModal = ({ onClose }) => {
  const { login, register, loading, isAuthenticated } = useAuth();
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    accept_terms: false,
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const isLogin = mode === "login";

  /* =========================================================
     VALIDATION HELPERS
  ========================================================= */
  const validateSingleField = (name, value, allData, isLoginMode) => {
    if (isLoginMode) {
      if (name === "email") {
        if (!value || !value.trim()) return "Please enter your email.";
        if (!emailRegex.test(value.trim())) return "Please enter a valid email address.";
      }
      if (name === "password") {
        if (!value) return "Please enter your password.";
      }
      return "";
    }

    switch (name) {
      case "first_name":
        if (!value || !value.trim()) return "Please enter your first name.";
        if (value.trim().length < 2) return "First name must be at least 2 characters.";
        return "";
      case "last_name":
        if (!value || !value.trim()) return "Please enter your last name.";
        return "";
      case "email":
        if (!value || !value.trim()) return "Please enter your email.";
        if (!emailRegex.test(value.trim())) return "Please enter a valid email address.";
        return "";
      case "phone":
        if (!value || !value.trim()) return "Please enter your phone number.";
        if (!phoneRegex.test(value.trim())) return "Please enter a valid phone number.";
        return "";
      case "password":
        if (!value) return "Please create a password.";
        if (value.length < 12) return "Password must be at least 12 characters.";
        if (!strongPasswordRegex.test(value)) {
          return "Use 12+ characters with upper, lower, number, and symbol.";
        }
        return "";
      case "password_confirmation":
        if (!value) return "Please confirm your password.";
        if (value !== allData.password) return "Passwords do not match.";
        return "";
      case "accept_terms":
        if (!value) return "Please accept the terms and conditions.";
        return "";
      default:
        return "";
    }
  };

  const passwordCriteria = {
    length: formData.password.length >= 12,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSymbol: /[^A-Za-z0-9]/.test(formData.password),
  };

  /* =========================================================
     INPUT CHANGE & BLUR
  ========================================================= */
  const handleBlur = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateSingleField(name, val, formData, isLogin);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === "checkbox" ? checked : value;
    if ((name === "email" || type === "email") && typeof val === "string") {
      val = val.toLowerCase();
    }
    const nextFormData = {
      ...formData,
      [name]: val,
    };
    setFormData(nextFormData);

    if (error) {
      setError("");
    }

    if (touched[name]) {
      const err = validateSingleField(name, val, nextFormData, isLogin);
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }

    if (name === "password" && !isLogin && touched.password_confirmation) {
      const confirmErr = validateSingleField(
        "password_confirmation",
        nextFormData.password_confirmation,
        nextFormData,
        isLogin
      );
      setFieldErrors((prev) => ({ ...prev, password_confirmation: confirmErr }));
    }
  };

  /* =========================================================
     SWITCH LOGIN / REGISTER
  ========================================================= */
  const switchMode = () => {
    setError("");
    setFieldErrors({});
    setTouched({});
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      password_confirmation: "",
      accept_terms: false,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  /* =========================================================
     SUBMIT
  ========================================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const fieldsToValidate = isLogin
      ? ["email", "password"]
      : ["first_name", "last_name", "email", "phone", "password", "password_confirmation", "accept_terms"];

    const newFieldErrors = {};
    const newTouched = {};

    fieldsToValidate.forEach((field) => {
      newTouched[field] = true;
      const err = validateSingleField(field, formData[field], formData, isLogin);
      if (err) {
        newFieldErrors[field] = err;
      }
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setFieldErrors(newFieldErrors);

    if (Object.keys(newFieldErrors).length > 0) {
      return;
    }

    try {
      if (isLogin) {
        /* =========================
           LOGIN
        ========================= */
        await login({
          login: formData.email,
          password: formData.password,
        });
      } else {
        /* =========================
           REGISTER
        ========================= */
        await register({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          password_confirmation: formData.password_confirmation,
          accept_terms: formData.accept_terms,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Unable to ${isLogin ? "login" : "register"}. Please try again.`
      );
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-black/50
        p-3
        sm:p-6
        backdrop-blur-md
        overflow-y-auto
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* =====================================================
          MODAL
      ====================================================== */}
      <div
        className="
          relative
          w-full
          max-w-[900px]
          max-h-[calc(100dvh-1.5rem)]
          sm:max-h-[calc(100dvh-3rem)]
          overflow-hidden
          rounded-[24px]
          sm:rounded-[32px]
          bg-white
          shadow-[0_25px_80px_rgba(0,0,0,0.22)]
          flex
          flex-col
          my-auto
        "
      >
        {/* ===================================================
            DECORATIVE BACKGROUND
        ==================================================== */}
        <div
          className="
            pointer-events-none
            absolute
            -right-20
            -top-20
            h-64
            w-64
            rounded-full
            bg-[#079447]/10
            blur-3xl
          "
        />
        <div
          className="
            pointer-events-none
            absolute
            -bottom-24
            -left-20
            h-64
            w-64
            rounded-full
            bg-[#079447]/10
            blur-3xl
          "
        />

        {/* ===================================================
            CLOSE
        ==================================================== */}
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

        <div
          className="
            relative
            grid
            min-h-0
            flex-1
            overflow-hidden
            lg:min-h-[520px]
            lg:grid-cols-[0.85fr_1.15fr]
          "
        >
          {/* =================================================
              LEFT BRAND PANEL
          ================================================= */}
          <div
            className="
              relative
              hidden
              overflow-hidden
              bg-[#079447]
              p-8
              xl:p-10
              text-white
              lg:flex
              lg:flex-col
              lg:justify-between
            "
          >
            {/* Decorative circles */}
            <div
              className="
                pointer-events-none
                absolute
                -right-24
                -top-24
                h-64
                w-64
                rounded-full
                border-[40px]
                border-white/10
              "
            />
            <div
              className="
                pointer-events-none
                absolute
                -bottom-24
                -left-24
                h-72
                w-72
                rounded-full
                border-[45px]
                border-white/10
              "
            />

            {/* =================================================
                CENTERED LOGO
            ================================================= */}
            <div
              className="
                relative
                z-10
                flex
                flex-col
                items-center
                text-center
              "
            >
              <div
                className="
                  flex
                  min-h-[90px]
                  min-w-[50px]
                  items-center
                  justify-center
                  rounded-[22px]
                  border-white/20
                  bg-white
                  px-4
                  py-2.5
                  shadow-lg
                "
              >
                <img
                  src={Logo}
                  alt="SNA Sundaram"
                  className="
                    h-auto
                    w-[65px]
                    max-w-full
                    object-contain
                  "
                />
              </div>
              <p
                className="
                  mt-3
                  text-[10px]
                  uppercase
                  tracking-[0.25em]
                  text-white/90
                "
              >
                Pure   Healthy   Homemade
              </p>
            </div>

            {/* =================================================
                CENTER CONTENT
            ================================================= */}
            <div className="relative z-10">
              <div
                className="
                  mb-4
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-white/15
                  backdrop-blur
                "
              >
                <Sparkles size={19} />
              </div>
              <h2
                className="
                  max-w-[350px]
                  text-3xl
                  xl:text-4xl
                  font-medium
                  leading-[1.15]
                "
              >
                {isLogin
                  ? "Welcome back to goodness."
                  : "Bring homemade goodness home."}
              </h2>
              <p
                className="
                  mt-4
                  max-w-[340px]
                  text-xs
                  xl:text-sm
                  leading-6
                  text-white/80
                "
              >
                {isLogin
                  ? "Continue your journey with authentic, homemade products crafted with care."
                  : "Create your account and discover authentic homemade products made with carefully selected ingredients."}
              </p>
            </div>

            {/* =================================================
                TRUST
            ================================================= */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs xl:text-sm">
                <ShieldCheck size={18} />
                <span>Made with care. Trusted by families.</span>
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT FORM
          ================================================= */}
          <div
            className="
              relative
              flex
              min-h-0
              h-full
              flex-col
              justify-between
              overflow-hidden
              p-5
              sm:p-8
              lg:p-10
            "
          >
            {/* =================================================
                MOBILE CENTERED BRAND
            ================================================= */}
            <div
              className="
                mb-3
                flex
                shrink-0
                flex-col
                items-center
                justify-center
                text-center
                lg:hidden
              "
            >
              <img
                src={Logo}
                alt="SNA Sundaram"
                className="
                  h-auto
                  w-[75px]
                  max-w-[50%]
                  object-contain
                "
              />
              <p
                className="
                  mt-1.5
                  text-[9px]
                  uppercase
                  tracking-[0.2em]
                  text-gray-400
                "
              >
                Pure   Healthy   Homemade
              </p>
            </div>

            <div
              className="
                flex-1
                min-h-0
                overflow-y-auto
                overscroll-contain
                pr-1.5
                sm:pr-2
              "
            >
              {/* =================================================
                  HEADER
              ================================================= */}
              <div>
                <div className="flex items-center gap-1">
                  <h1
                    className="
                      text-2xl
                      font-semibold
                      tracking-tight
                      text-[#333]
                      sm:text-3xl
                    "
                  >
                    {isLogin ? "Welcome Back" : "Create Account"}
                  </h1>
                  <img
                    src={TinyLeaf}
                    alt=""
                    aria-hidden="true"
                    className="w-5"
                  />
                </div>
                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-gray-500
                  "
                >
                  {isLogin
                    ? "Login to continue to your SNA Sundaram account."
                    : "Create your account and start exploring homemade goodness."}
                </p>
              </div>

              {/* =================================================
                  ERROR
              ================================================= */}
              {error && (
                <div
                  className="
                    mt-5
                    rounded-xl
                    border
                    border-red-100
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    leading-5
                    text-red-600
                  "
                >
                  {error}
                </div>
              )}

              {/* =================================================
                  FORM
              ================================================= */}
              <form onSubmit={handleSubmit} className="
              mt-4 space-y-2
               sm:mt-10
              ">
                {/* =================================================
                    FIRST + LAST NAME
                ================================================= */}
                {!isLogin && (
                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-2.5
                      sm:grid-cols-2
                    "
                  >
                    {/* FIRST NAME */}
                    <div>
                      <input
                        id="first_name"
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="First name"
                        maxLength={50}
                        autoComplete="given-name"
                        aria-invalid={Boolean(fieldErrors.first_name)}
                        className={`
                          w-full
                          rounded-xl
                          border
                          ${
                            fieldErrors.first_name
                              ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                              : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                          }
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          transition-all
                          placeholder:text-gray-400
                        `}
                      />
                      <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                        {fieldErrors.first_name && (
                          <>
                            <AlertCircle size={12} className="shrink-0 text-red-600" />
                            <span>{fieldErrors.first_name}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* LAST NAME */}
                    <div>
                      <input
                        id="last_name"
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Last name"
                        maxLength={50}
                        autoComplete="family-name"
                        aria-invalid={Boolean(fieldErrors.last_name)}
                        className={`
                          w-full
                          rounded-xl
                          border
                          ${
                            fieldErrors.last_name
                              ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                              : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                          }
                          px-3.5
                          py-2.5
                          text-sm
                          outline-none
                          transition-all
                          placeholder:text-gray-400
                        `}
                      />
                      <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                        {fieldErrors.last_name && (
                          <>
                            <AlertCircle size={12} className="shrink-0 text-red-600" />
                            <span>{fieldErrors.last_name}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* =================================================
                    EMAIL
                ================================================= */}
                <div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your email"
                    maxLength={100}
                    autoComplete="email"
                    aria-invalid={Boolean(fieldErrors.email)}
                    className={`
                      w-full
                      rounded-xl
                      border
                      ${
                        fieldErrors.email
                          ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                          : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                      }
                      px-3.5
                      py-2.5
                      text-sm
                      outline-none
                      transition-all
                      placeholder:text-gray-400
                    `}
                  />
                  <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                    {fieldErrors.email && (
                      <>
                        <AlertCircle size={12} className="shrink-0 text-red-600" />
                        <span>{fieldErrors.email}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* =================================================
                    PHONE - REGISTER ONLY
                ================================================= */}
                {!isLogin && (
                  <div>
                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your phone number"
                      maxLength={15}
                      autoComplete="tel"
                      inputMode="tel"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      className={`
                        w-full
                        rounded-xl
                        border
                        ${
                          fieldErrors.phone
                            ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                        }
                        px-3.5
                        py-2.5
                        text-sm
                        outline-none
                        transition-all
                        placeholder:text-gray-400
                      `}
                    />
                    <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                      {fieldErrors.phone && (
                        <>
                          <AlertCircle size={12} className="shrink-0 text-red-600" />
                          <span>{fieldErrors.phone}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* =================================================
                    PASSWORD
                ================================================= */}
                <div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your password"
                      maxLength={128}
                      autoComplete={
                        isLogin ? "current-password" : "new-password"
                      }
                      aria-invalid={Boolean(fieldErrors.password)}
                      className={`
                        w-full
                        rounded-xl
                        border
                        ${
                          fieldErrors.password
                            ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                        }
                        px-3.5
                        py-2.5
                        pr-11
                        text-sm
                        outline-none
                        transition-all
                        placeholder:text-gray-400
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="
                        absolute
                        right-3
                        top-1/2
                        -translate-y-1/2
                        text-gray-400
                        transition
                        hover:text-[#079447]
                      "
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between min-h-[14px]">
                    <p className="flex items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                      {fieldErrors.password && (
                        <>
                          <AlertCircle size={12} className="shrink-0 text-red-600" />
                          <span>{fieldErrors.password}</span>
                        </>
                      )}
                    </p>
                    {isLogin && (
                      <Link
                        to="/auth/forgot-password"
                        className="text-xs font-medium text-[#079447] transition hover:underline ml-auto"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  {!isLogin && (formData.password || touched.password) && (
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

                {/* =================================================
                    CONFIRM PASSWORD
                ================================================= */}
                {!isLogin && (
                  <div>
                    <div className="relative">
                      <input
                        id="password_confirmation"
                        type={showConfirmPassword ? "text" : "password"}
                        name="password_confirmation"
                        value={formData.password_confirmation}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onPaste={(e) => e.preventDefault()}
                        placeholder="Confirm your password"
                        maxLength={128}
                        autoComplete="new-password"
                        aria-invalid={Boolean(fieldErrors.password_confirmation)}
                        className={`
                          w-full
                          rounded-xl
                          border
                          ${
                            fieldErrors.password_confirmation
                              ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                              : "border-gray-200 bg-gray-50 text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                          }
                          px-3.5
                          py-2.5
                          pr-11
                          text-sm
                          outline-none
                          transition-all
                          placeholder:text-gray-400
                        `}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="
                          absolute
                          right-3
                          top-1/2
                          -translate-y-1/2
                          text-gray-400
                          transition
                          hover:text-[#079447]
                        "
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                      {fieldErrors.password_confirmation && (
                        <>
                          <AlertCircle size={12} className="shrink-0 text-red-600" />
                          <span>{fieldErrors.password_confirmation}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* =================================================
                    TERMS - REGISTER ONLY
                ================================================= */}
                {!isLogin && (
                  <div>
                    <label
                      className="
                        flex
                        items-start
                        gap-3
                        pt-0.5
                      "
                    >
                      <input
                        type="checkbox"
                        name="accept_terms"
                        checked={formData.accept_terms}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(fieldErrors.accept_terms)}
                        className={`
                          mt-0.5
                          h-4
                          w-4
                          shrink-0
                          accent-[#079447]
                          ${fieldErrors.accept_terms ? "ring-2 ring-red-500/50 rounded" : ""}
                        `}
                      />
                      <span
                        className="
                          text-xs
                          leading-5
                          text-gray-500
                        "
                      >
                        I agree to the{" "}
                        <Link
                          to={"/terms-and-conditions"}
                          className="
                            font-medium
                            text-[#079447]
                            hover:underline
                          "
                        >
                          Terms & Conditions
                        </Link>{" "}
                        and confirm that the information provided is correct.
                      </span>
                    </label>
                    <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                      {fieldErrors.accept_terms && (
                        <>
                          <AlertCircle size={12} className="shrink-0 text-red-600" />
                          <span>{fieldErrors.accept_terms}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* =================================================
                    SUBMIT
                ================================================= */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    group
                    mt-2
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#079447]
                    px-4
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_8px_20px_rgba(7,148,71,0.2)]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:bg-[#057a3a]
                    hover:shadow-[0_12px_25px_rgba(7,148,71,0.28)]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    disabled:hover:translate-y-0
                  "
                >
                  {loading ? (
                    <>
                      <span
                        className="
                          h-4
                          w-4
                          animate-spin
                          rounded-full
                          border-2
                          border-white/30
                          border-t-white
                        "
                      />
                      {isLogin ? "Logging in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      {isLogin ? "Login to Account" : "Create My Account"}
                      <span
                        className="
                          transition-transform
                          duration-300
                          group-hover:translate-x-1
                        "
                      ></span>
                    </>
                  )}
                </button>
              </form>

              {/* =================================================
                  SWITCH
              ================================================= */}
              <div
                className="
                  mt-3
                  text-center
                  text-sm
                  text-gray-500
                  sm:mt-3
                  md:mt-6
                  lg:mt-10
                "
              >
                {isLogin
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button
                  type="button"
                  onClick={switchMode}
                  className="
                    ml-1
                    font-semibold
                    text-[#079447]
                    transition
                    hover:underline
                  "
                >
                  {isLogin ? "Create one" : "Login instead"}
                </button>
              </div>

              {/* =================================================
                  FOOTER TRUST
              ================================================= */}
              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-[11px]
                  text-gray-400
                  sm:mt-7
                  md:mt-7
                  lg:mt-6
                "
              >
                <ShieldCheck size={14} className="text-[#079447]" />
                <span>Your information is kept secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;