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
    value: "hello@sna-sundaram.com",
    description: "We usually respond within 24 hours",
    href: "mailto:hello@sna-sundaram.com",
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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Connect this with your API later
    console.log("Contact form:", formData);

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
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(7,148,71,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(9,107,53,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_42%)]" />

      <section className="relative mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 md:px-10 lg:px-[clamp(42px,5vw,84px)] lg:py-16 xl:px-12">
        {/* ===================================================
            HERO
        ==================================================== */}

        <div className="relative mb-6 overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2a1e_0%,#123627_55%,#0b5130_100%)] p-7 text-white shadow-[0_24px_60px_rgba(13,35,25,0.18)] sm:p-10 lg:p-12">
          {/* Decorative circles */}

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

        {/* ===================================================
            CONTACT DETAILS
        ==================================================== */}

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

        {/* ===================================================
            MAIN CONTACT SECTION
        ==================================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* =================================================
              LEFT INFORMATION
          ================================================= */}

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
              href="https://wa.me/91XXXXXXXXXX"
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

          {/* =================================================
              CONTACT FORM
          ================================================= */}

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
                  className="mt-8 space-y-5"
                >
                  {/* NAME */}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-2 block text-[13px] font-medium text-[#444]"
                      >
                        Your Name
                      </label>

                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your name"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-[#f9faf9] px-4 py-3.5 text-sm text-[#333] outline-none transition-all placeholder:text-gray-400 focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                      />
                    </div>

                    {/* EMAIL */}

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-[13px] font-medium text-[#444]"
                      >
                        Email Address
                      </label>

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className="w-full rounded-xl border border-gray-200 bg-[#f9faf9] px-4 py-3.5 text-sm text-[#333] outline-none transition-all placeholder:text-gray-400 focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                      />
                    </div>
                  </div>

                  {/* PHONE + SUBJECT */}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="phone"
                        className="mb-2 block text-[13px] font-medium text-[#444]"
                      >
                        Phone Number
                      </label>

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full rounded-xl border border-gray-200 bg-[#f9faf9] px-4 py-3.5 text-sm text-[#333] outline-none transition-all placeholder:text-gray-400 focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="mb-2 block text-[13px] font-medium text-[#444]"
                      >
                        Subject
                      </label>

                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-[#f9faf9] px-4 py-3.5 text-sm text-[#333] outline-none transition-all focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                      >
                        <option value="">
                          Select a subject
                        </option>
                        <option value="product">
                          Product enquiry
                        </option>
                        <option value="order">
                          Order support
                        </option>
                        <option value="delivery">
                          Delivery enquiry
                        </option>
                        <option value="feedback">
                          Feedback
                        </option>
                        <option value="other">
                          Other
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* MESSAGE */}

                  <div>
                    <label
                      htmlFor="message"
                      className="mb-2 block text-[13px] font-medium text-[#444]"
                    >
                      Your Message
                    </label>

                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us how we can help..."
                      rows={6}
                      required
                      className="w-full resize-none rounded-xl border border-gray-200 bg-[#f9faf9] px-4 py-3.5 text-sm leading-6 text-[#333] outline-none transition-all placeholder:text-gray-400 focus:border-[#079447] focus:bg-white focus:ring-4 focus:ring-[#079447]/10"
                    />
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
              /* =================================================
                 SUCCESS STATE
              ================================================== */

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

        {/* ===================================================
            BOTTOM BRAND STATEMENT
        ==================================================== */}

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
