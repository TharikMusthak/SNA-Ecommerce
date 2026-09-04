import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Clock3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from "lucide-react";

const contactDetails = [
  {
    icon: Phone,
    label: "Call us",
    value: "+91 8438660669",
    description: "Available for product & order enquiries",
    href: "tel:+918438660669",
  },
  {
    icon: Mail,
    label: "Email us",
    value: "snasundaram@gmail.com",
    description: "We usually respond within 24 hours",
    href: "mailto:snasundaram@gmail.com",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "Chat with us",
    description: "For quick questions & order support",
    href: "https://wa.me/918438660669",
  },
  {
    icon: MapPin,
    label: "Our home",
    value: "Tamil Nadu, India",
    description: "Proudly made with care for Indian homes",
    href: "#location",
  },
];

const ContactUs = () => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value || !value.trim()) return "Enter your name.";
        return "";
      case "email":
        if (!value || !value.trim()) return "Enter your email.";
        if (!emailRegex.test(value.trim())) return "Enter a valid email address.";
        return "";
      case "phone":
        if (value && !phoneRegex.test(value.trim())) return "Enter a valid phone number.";
        return "";
      case "subject":
        if (!value) return "Choose a subject.";
        return "";
      case "message":
        if (!value || !value.trim()) return "Enter a message.";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let val = value;
    if ((name === "email" || type === "email") && typeof val === "string") {
      val = val.toLowerCase();
    }
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));

    if (touched[name]) {
      const err = validateField(name, val);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fieldsToValidate = ["name", "email", "subject", "message"];
    if (formData.phone) fieldsToValidate.push("phone");

    const nextErrors = {};
    const nextTouched = {};

    fieldsToValidate.forEach((field) => {
      nextTouched[field] = true;
      const err = validateField(field, formData[field]);
      if (err) nextErrors[field] = err;
    });

    setTouched((prev) => ({ ...prev, ...nextTouched }));

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitted(true);
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f4f7f5]">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(7,148,71,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(9,107,53,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_42%)]" />

      <section className="relative mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 md:px-10 lg:px-[clamp(42px,5vw,84px)] lg:py-16 xl:px-12">
        {/* HERO */}
        <div className="relative mb-6 overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2a1e_0%,#123627_55%,#0b5130_100%)] p-7 text-white shadow-[0_24px_60px_rgba(13,35,25,0.18)] sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[45px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

          <div className="relative z-10 max-w-[800px]">
            <div className="mb-5 flex items-center gap-2 text-[#7ee3a8]">
              <Sparkles size={17} />
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em]">
                We'd love to hear from you
              </p>
            </div>

            <h1 className="max-w-[750px] text-[clamp(36px,5vw,68px)] font-medium leading-[1.02] tracking-[-0.045em]">
              Let&apos;s talk about
              <span className="block text-[#7ee3a8]">
                goodness.
              </span>
            </h1>

            <p className="mt-6 max-w-[650px] text-[15px] leading-[1.85] text-white/72 sm:text-[16px]">
              Have a question about our products, your order, or simply want
              to know more about SNA Sundaram? We&apos;re here to help.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-[13px] text-white/80 backdrop-blur">
                <CheckCircle2 size={15} className="text-[#7ee3a8]" />
                Family-led
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-[13px] text-white/80 backdrop-blur">
                <CheckCircle2 size={15} className="text-[#7ee3a8]" />
                Made with care
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-[13px] text-white/80 backdrop-blur">
                <CheckCircle2 size={15} className="text-[#7ee3a8]" />
                Here to help
              </div>
            </div>
          </div>
        </div>

        {/* CONTACT DETAILS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {contactDetails.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href={item.href}
                className="group rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.08)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf8f1] text-[#079447] transition-colors duration-300 group-hover:bg-[#079447] group-hover:text-white">
                    <Icon size={21} strokeWidth={1.8} />
                  </div>

                  <ArrowRight
                    size={18}
                    className="text-gray-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#079447]"
                  />
                </div>

                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#079447]">
                  {item.label}
                </p>

                <p className="mt-2 break-words text-[17px] font-semibold text-[#2f2f2f]">
                  {item.value}
                </p>

                <p className="mt-2 text-[13px] leading-[1.7] text-[#737373]">
                  {item.description}
                </p>
              </a>
            );
          })}
        </div>

        {/* MAIN CONTACT SECTION */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* LEFT INFORMATION */}
          <div className="rounded-[32px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf8f1] text-[#079447]">
              <MessageCircle size={21} />
            </div>

            <p className="mt-7 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#079447]">
              Start a conversation
            </p>

            <h2 className="mt-3 text-[clamp(28px,3vw,42px)] font-medium leading-[1.1] tracking-[-0.03em] text-[#2d2d2d]">
              We&apos;re listening.
            </h2>

            <p className="mt-5 text-[15px] leading-[1.85] text-[#555]">
              Whether you&apos;re curious about an ingredient, need help with
              an order, or simply want to share your experience, every message
              matters to us.
            </p>

            {/* RESPONSE TIME */}
            <div className="mt-8 rounded-[24px] bg-[#f6faf7] p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#079447] shadow-sm">
                  <Clock3 size={18} />
                </div>

                <div>
                  <p className="text-[13px] font-semibold text-[#303630]">
                    Our response time
                  </p>

                  <p className="mt-1 text-[13px] leading-[1.7] text-[#687169]">
                    We aim to respond to messages within 24 hours during
                    working days.
                  </p>
                </div>
              </div>
            </div>

            {/* WHATSAPP */}
            <a
              href="https://wa.me/918438660669"
              className="mt-4 flex items-center justify-between rounded-[24px] bg-[#079447] px-5 py-4 text-white transition-all duration-300 hover:bg-[#06753a]"
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={20} />

                <div>
                  <p className="text-sm font-semibold">
                    Prefer WhatsApp?
                  </p>

                  <p className="mt-0.5 text-xs text-white/70">
                    Chat with our team directly
                  </p>
                </div>
              </div>

              <ArrowRight size={18} />
            </a>

            {/* LOCATION */}
            <div
              id="location"
              className="mt-8 border-t border-gray-100 pt-7"
            >
              <div className="flex gap-3">
                <MapPin
                  size={19}
                  className="mt-0.5 shrink-0 text-[#079447]"
                />

                <div>
                  <p className="text-[13px] font-semibold text-[#303630]">
                    Where we&apos;re from
                  </p>

                  <p className="mt-1 text-[14px] leading-[1.7] text-[#737373]">
                    Tisaiyanvilai, Tirunelveli
                  </p>

                  <p className="mt-1 text-[12px] text-gray-400">
                    Made with care for everyday homes.
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-[#f6faf7] shadow-sm">
                <iframe
                  title="SNA Sundaram location in Tisaiyanvilai, Tirunelveli"
                  src="https://www.google.com/maps?q=Tisaiyanvilai%2C%20Tirunelveli&output=embed"
                  className="h-56 w-full border-0 sm:h-64"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* CONTACT FORM */}
          <div className="rounded-[32px] border border-white/70 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
            {!submitted ? (
              <>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#079447]">
                    Send us a message
                  </p>

                  <h2 className="mt-3 text-[clamp(28px,3vw,42px)] font-medium leading-[1.1] tracking-[-0.03em] text-[#2d2d2d]">
                    How can we help?
                  </h2>

                  <p className="mt-4 text-[14px] leading-[1.8] text-[#707070]">
                    Fill in the details below and our team will get back to
                    you.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-6 space-y-2.5"
                >
                  {/* NAME + EMAIL */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Name"
                        maxLength={100}
                        aria-invalid={Boolean(errors.name)}
                        className={`w-full rounded-xl border ${
                          errors.name
                            ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 bg-[#f9faf9] text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
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

                    <div>
                      <input
                        id="email"
                        name="email"
                        type="text"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Email"
                        maxLength={100}
                        inputMode="email"
                        aria-invalid={Boolean(errors.email)}
                        className={`w-full rounded-xl border ${
                          errors.email
                            ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 bg-[#f9faf9] text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
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
                  </div>

                  {/* PHONE + SUBJECT */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Phone number"
                        maxLength={15}
                        aria-invalid={Boolean(errors.phone)}
                        className={`w-full rounded-xl border ${
                          errors.phone
                            ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 bg-[#f9faf9] text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
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

                    <div>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        aria-invalid={Boolean(errors.subject)}
                        className={`w-full appearance-none rounded-xl border ${
                          errors.subject
                            ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                            : "border-gray-200 bg-[#f9faf9] text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                        } px-3.5 py-2.5 text-sm outline-none transition-all`}
                      >
                        <option value="">Select a subject</option>
                        <option value="product">Product enquiry</option>
                        <option value="order">Order support</option>
                        <option value="delivery">Delivery enquiry</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                      </select>
                      <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                        {errors.subject && (
                          <>
                            <AlertCircle size={12} className="shrink-0 text-red-600" />
                            <span>{errors.subject}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* MESSAGE */}
                  <div>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Tell us how we can help..."
                      maxLength={1000}
                      rows={5}
                      aria-invalid={Boolean(errors.message)}
                      className={`w-full resize-none rounded-xl border ${
                        errors.message
                          ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                          : "border-gray-200 bg-[#f9faf9] text-[#333] focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                      } px-3.5 py-2.5 text-sm leading-6 outline-none transition-all placeholder:text-gray-400`}
                    />
                    <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                      {errors.message && (
                        <>
                          <AlertCircle size={12} className="shrink-0 text-red-600" />
                          <span>{errors.message}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* SUBMIT */}
                  <button
                    type="submit"
                    className="group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#079447] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(7,148,71,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#06753a] hover:shadow-[0_12px_25px_rgba(7,148,71,0.25)]"
                  >
                    Send Message
                    <ArrowRight
                      size={18}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </button>
                </form>
              </>
            ) : (
              /* SUCCESS STATE */
              <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-[#edf8f1] text-[#079447]">
                  <CheckCircle2 size={30} />
                </div>

                <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#079447]">
                  Message received
                </p>

                <h2 className="mt-3 text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.03em] text-[#2d2d2d]">
                  Thank you for reaching out.
                </h2>

                <p className="mt-4 max-w-[460px] text-[14px] leading-[1.8] text-[#707070]">
                  Your message has been received. Our team will get back to
                  you as soon as possible.
                </p>

                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-7 rounded-full border border-[#079447] px-6 py-3 text-sm font-semibold text-[#079447] transition hover:bg-[#079447] hover:text-white"
                >
                  Send another message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BRAND STATEMENT */}
        <div className="mt-6 rounded-[30px] border border-white/70 bg-white p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.05)] sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#079447]">
            SNA Sundaram
          </p>

          <p className="mx-auto mt-3 max-w-[650px] text-[17px] leading-[1.7] text-[#343434] sm:text-[19px]">
            Pure ingredients. Thoughtful preparation. Homemade goodness for
            everyday life.
          </p>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
