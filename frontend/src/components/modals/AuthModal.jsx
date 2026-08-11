import { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

// import { loginUser,registerUser } from "@context/AuthProvider";
import { useAuth } from "@context/AuthProvider";

import TinyLeaf from "@assets/images/tinyleaf.svg";
import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";
import { useNavigate } from "react-router-dom";

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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
   const navigate = useNavigate();

  const isLogin = mode === "login";

  /* =========================================================
     INPUT CHANGE
  ========================================================= */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (error) {
      setError("");
    }
  };

  /* =========================================================
     SWITCH LOGIN / REGISTER
  ========================================================= */

  const switchMode = () => {
    setError("");

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

    setMode((prev) =>
      prev === "login" ? "register" : "login"
    );
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    /* =========================
       REGISTER VALIDATION
    ========================= */

    if (!isLogin) {
      if (!formData.first_name.trim()) {
        setError("Please enter your first name.");
        return;
      }

      if (!formData.last_name.trim()) {
        setError("Please enter your last name.");
        return;
      }

      if (!formData.phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }

      if (formData.password.length < 6) {
        setError(
          "Password must contain at least 6 characters."
        );
        return;
      }

      if (
        formData.password !==
        formData.password_confirmation
      ) {
        setError("Passwords do not match.");
        return;
      }

      if (!formData.accept_terms) {
        setError(
          "Please accept the terms and conditions."
        );
        return;
      }
    }

 
    try {
      if (isLogin) {
        /* =========================
           LOGIN
        ========================= */

        await login({
          login: formData.email,
          password: formData.password
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
          password_confirmation:
            formData.password_confirmation,
          accept_terms: formData.accept_terms,
        });
      }

      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          `Unable to ${
            isLogin ? "login" : "register"
          }. Please try again.`
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
        px-4
        py-6
        backdrop-blur-md
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
          overflow-hidden
          rounded-[28px]
          bg-white
          shadow-[0_25px_80px_rgba(0,0,0,0.22)]

          h-auto
max-h-[90vh]
overflow-hidden

          sm:rounded-[32px]
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
            min-h-[550px]

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
              p-10
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
                  min-h-[100px]
                  min-w-[50]
                  items-center
                  justify-center
                  rounded-[25px]
                  border-white/20
                  bg-white
                  px-4
                  py-3
                  shadow-lg
                "
              >
                <img
                  src={Logo}
                  alt="SNA Sundaram"
                  className="
                    h-auto
                    w-[70px]
                    max-w-full
                    object-contain
                  "
                />
              </div>

              <p
                className="
                  mt-4
                  text-[11px]
                  uppercase
                  tracking-[0.25em]
                  text-white/90
                "
              >
                Pure • Healthy • Homemade
              </p>
            </div>

            {/* =================================================
                CENTER CONTENT
            ================================================= */}

            <div className="relative z-10">
              <div
                className="
                  mb-5
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-white/15
                  backdrop-blur
                "
              >
                <Sparkles size={21} />
              </div>

              <h2
                className="
                  max-w-[350px]
                  text-4xl
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
                  mt-5
                  max-w-[340px]
                  text-sm
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
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck size={18} />

                <span>
                  Made with care. Trusted by families.
                </span>
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
              flex-col
              justify-center
              p-6

              sm:p-8

              md:p-10

              lg:p-12
            "
          >
            {/* =================================================
                MOBILE CENTERED BRAND
            ================================================= */}

            <div
              className="
                mb-7
                flex
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
                  w-[110px]
                  max-w-[65%]
                  object-contain
                "
              />

              <p
                className="
                  mt-2
                  text-[10px]
                  uppercase
                  tracking-[0.2em]
                  text-gray-400
                "
              >
                Pure • Healthy • Homemade
              </p>
            </div>

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
                  {isLogin
                    ? "Welcome Back"
                    : "Create Account"}
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

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-4"
            >
              {/* =================================================
                  FIRST + LAST NAME
              ================================================= */}

              {!isLogin && (
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-4

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
                      placeholder="First name"
                      required
                      autoComplete="given-name"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        px-4
                        py-3
                        text-sm
                        text-[#333]
                        outline-none
                        transition-all
                        placeholder:text-gray-400
                        focus:border-[#079447]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#079447]/10
                      "
                    />
                  </div>

                  {/* LAST NAME */}

                  <div>
                    

                    <input
                      id="last_name"
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Last name"
                      required
                      autoComplete="family-name"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        px-4
                        py-3
                        text-sm
                        text-[#333]
                        outline-none
                        transition-all
                        placeholder:text-gray-400
                        focus:border-[#079447]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#079447]/10
                      "
                    />
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
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    px-4
                    py-3
                    text-sm
                    text-[#333]
                    outline-none
                    transition-all
                    placeholder:text-gray-400
                    focus:border-[#079447]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#079447]/10
                  "
                />
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
                    placeholder="Enter your phone number"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      px-4
                      py-3
                      text-sm
                      text-[#333]
                      outline-none
                      transition-all
                      placeholder:text-gray-400
                      focus:border-[#079447]
                      focus:bg-white
                      focus:ring-4
                      focus:ring-[#079447]/10
                    "
                  />
                </div>
              )}

              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div>
              

                <div className="relative">
                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    autoComplete={
                      isLogin
                        ? "current-password"
                        : "new-password"
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-gray-200
                      bg-gray-50
                      px-4
                      py-3
                      pr-12
                      text-sm
                      text-[#333]
                      outline-none
                      transition-all
                      placeholder:text-gray-400
                      focus:border-[#079447]
                      focus:bg-white
                      focus:ring-4
                      focus:ring-[#079447]/10
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (prev) => !prev
                      )
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
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* =================================================
                  CONFIRM PASSWORD
              ================================================= */}

              {!isLogin && (
                <div>
            

                  <div className="relative">
                    <input
                      id="password_confirmation"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="password_confirmation"
                      value={
                        formData.password_confirmation
                      }
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      required
                      autoComplete="new-password"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-gray-50
                        px-4
                        py-3
                        pr-12
                        text-sm
                        text-[#333]
                        outline-none
                        transition-all
                        placeholder:text-gray-400
                        focus:border-[#079447]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#079447]/10
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (prev) => !prev
                        )
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
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================
                  TERMS - REGISTER ONLY
              ================================================= */}

              {!isLogin && (
                <label
                  className="
                    flex
                    cursor-pointer
                    items-start
                    gap-3
                    pt-1
                  "
                >
                  <input
                    type="checkbox"
                    name="accept_terms"
                    checked={formData.accept_terms}
                    onChange={handleChange}
                    className="
                      mt-1
                      h-4
                      w-4
                      shrink-0
                      cursor-pointer
                      accent-[#079447]
                    "
                  />

                  <span
                    className="
                      text-xs
                      leading-5
                      text-gray-500
                    "
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      className="
                        font-medium
                        text-[#079447]
                        hover:underline
                      "
                      onClick={(e) =>
                        e.preventDefault()
                      }
                    >
                      Terms & Conditions
                    </button>{" "}
                    and confirm that the information
                    provided is correct.
                  </span>
                </label>
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

                    {isLogin
                      ? "Logging in..."
                      : "Creating account..."}
                  </>
                ) : (
                  <>
                    {isLogin
                      ? "Login to Account"
                      : "Create My Account"}

                    <span
                      className="
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                      "
                    >
                      →
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* =================================================
                SWITCH
            ================================================= */}

            <div
              className="
                mt-6
                text-center
                text-sm
                text-gray-500
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
                {isLogin
                  ? "Create one"
                  : "Login instead"}
              </button>
            </div>

            {/* =================================================
                FOOTER TRUST
            ================================================= */}

            <div
              className="
                mt-6
                flex
                items-center
                justify-center
                gap-2
                text-[11px]
                text-gray-400
              "
            >
              <ShieldCheck
                size={14}
                className="text-[#079447]"
              />

              <span>
                Your information is kept secure
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
