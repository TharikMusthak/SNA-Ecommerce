import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarRange,
  CheckCircle2,
  FileText,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Clear payment terms",
    text: "Orders are confirmed only after successful payment or confirmed cash-on-delivery availability, if offered.",
  },
  {
    icon: ShoppingBag,
    title: "Order and delivery rules",
    text: "Product availability, pricing, packaging, and delivery timelines may vary by location and stock.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Refund and cancellation support",
    text: "Refunds, where approved, are processed back to the original payment method within a reasonable time.",
  },
];

const sections = [
  {
    title: "1. Acceptance of terms",
    body: [
      "By browsing our website, placing an order, or making a payment, you agree to these Terms and Conditions. If you do not agree, please do not use the website or complete a purchase.",
      "These terms apply to all visitors, customers, and anyone who interacts with SNA Sundaram online.",
    ],
  },
  {
    title: "2. Products and availability",
    body: [
      "We make every effort to display accurate product information, but product names, images, ingredients, descriptions, and packaging may change from time to time.",
      "All products are subject to availability. If an item is unavailable after you place an order, we may contact you with an alternative, a revised delivery timeline, or a refund option.",
    ],
  },
  {
    title: "3. Pricing and taxes",
    body: [
      "Prices shown on the website are in Indian Rupees unless stated otherwise. Applicable taxes, packaging charges, and delivery fees may be added at checkout where relevant.",
      "We reserve the right to revise prices at any time before order confirmation. The price charged will be the price displayed at the time your order is confirmed.",
    ],
  },
  {
    title: "4. Orders and payment",
    body: [
      "When you place an order, you agree to provide accurate and complete details including your name, contact number, delivery address, and any other information required to complete the purchase.",
      "Payments may be processed through third-party payment gateways such as Razorpay. We do not store your card, UPI, or net banking credentials on our servers.",
      "If a payment fails, is reversed, or is flagged by the payment provider, the order may be delayed or cancelled until payment is successfully completed.",
    ],
  },
  {
    title: "5. Shipping and delivery",
    body: [
      "We aim to dispatch orders within the timelines mentioned on the website or communicated at checkout, but delivery dates are estimates and may change due to location, courier delays, weather, public holidays, or other factors beyond our control.",
      "Risk in the products passes to the customer once the order has been delivered to the address provided at checkout.",
    ],
  },
  {
    title: "6. Cancellation and refunds",
    body: [
      "Order cancellation requests should be raised as early as possible. Once an order has been packed, dispatched, or delivered, cancellation may not be possible.",
      "Refunds, if approved, will be processed to the original payment method within a reasonable time after review. The exact timeline may depend on your bank, card issuer, or payment gateway.",
      "If a product is damaged, defective, missing, or incorrect, please contact us with order details and supporting photos, if available, so we can review the issue quickly.",
    ],
  },
  {
    title: "7. User responsibilities",
    body: [
      "You agree not to misuse the website, attempt unauthorized access, upload harmful content, or use the site in any way that could affect its security or availability.",
      "You are responsible for maintaining the confidentiality of your account credentials and for all activity carried out through your account.",
    ],
  },
  {
    title: "8. Limitation of liability",
    body: [
      "We work hard to provide accurate information and reliable service, but we do not guarantee that the website will always be error-free, uninterrupted, or free from technical issues.",
      "To the fullest extent permitted by law, SNA Sundaram will not be liable for indirect, incidental, or consequential losses arising from use of the website or products, except where such liability cannot be excluded by law.",
    ],
  },
  {
    title: "9. Updates to these terms",
    body: [
      "We may update these Terms and Conditions from time to time to reflect changes in our business, legal requirements, or payment and delivery processes.",
      "The latest version published on this page will apply from the date it is posted.",
    ],
  },
  {
    title: "10. Contact us",
    body: [
      "For questions about orders, payments, cancellations, or these terms, please contact us at support@snasundaram.com or call +91 84386 60669.",
    ],
  },
];

const TermsAndConditions = () => {
  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#f4f7f5] text-[#303530]">
      <section className="relative mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 md:px-10 lg:px-[clamp(42px,5vw,84px)] lg:py-16 xl:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(7,148,71,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(9,107,53,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_42%)]" />

        <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2a1e_0%,#123627_55%,#0b5130_100%)] p-7 text-white shadow-[0_24px_60px_rgba(13,35,25,0.18)] sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[45px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

          <div className="relative z-10 max-w-[850px]">
            <div className="mb-5 flex items-center gap-2 text-[#7ee3a8]">
              <FileText size={17} />
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em]">
                Legal information
              </p>
            </div>

            <h1 className="max-w-[750px] text-[clamp(36px,5vw,68px)] font-medium leading-[1.02] tracking-[-0.045em]">
              Terms and Conditions
              <span className="block text-[#7ee3a8]">
                for SNA Sundaram.
              </span>
            </h1>

            <p className="mt-6 max-w-[680px] text-[15px] leading-[1.85] text-white/72 sm:text-[16px]">
              These terms explain how orders, payments, delivery, refunds, and
              website use work when you shop with us online.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-[13px] text-white/80 backdrop-blur">
                <CheckCircle2 size={15} className="text-[#7ee3a8]" />
                Razorpay-friendly checkout
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-[13px] text-white/80 backdrop-blur">
                <CheckCircle2 size={15} className="text-[#7ee3a8]" />
                Refund and cancellation guidance
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.05)]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf8f1] text-[#079447]">
                  <Icon size={21} strokeWidth={1.8} />
                </div>
                <h2 className="mt-5 text-[18px] font-semibold text-[#2d2d2d]">
                  {item.title}
                </h2>
                <p className="mt-3 text-[14px] leading-[1.8] text-[#707070]">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.05)] sm:p-8 lg:p-10">
            <div className="flex items-center gap-2 text-[#079447]">
              <CalendarRange size={18} />
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em]">
                Effective immediately
              </p>
            </div>

            <p className="mt-4 text-[15px] leading-[1.85] text-[#707070]">
              Please read the following terms carefully before placing an order.
              If you have any questions, our team is happy to help.
            </p>

            <div className="mt-8 space-y-6">
              {sections.map((section) => (
                <section key={section.title} className="border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
                  <h2 className="text-[20px] font-semibold text-[#2d2d2d]">
                    {section.title}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-[15px] leading-[1.85] text-[#5e5e5e]">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="rounded-[32px] bg-[#0e3524] p-6 text-white shadow-[0_16px_40px_rgba(0,0,0,0.06)] sm:p-8 lg:p-10">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#7ee3a8]">
              Important notes
            </p>
            <h2 className="mt-3 text-[clamp(28px,3vw,40px)] font-medium leading-[1.08] tracking-[-0.03em]">
              Built for checkout clarity.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.85] text-white/75">
              These terms are structured to make payment review easier by clearly
              stating what customers can expect for pricing, order handling,
              shipping, cancellation, and refunds.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[22px] bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Payments</p>
                <p className="mt-1 text-sm leading-[1.7] text-white/72">
                  Payments may be processed by Razorpay or another authorized payment partner.
                </p>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Refunds</p>
                <p className="mt-1 text-sm leading-[1.7] text-white/72">
                  Approved refunds go back to the original payment method when possible.
                </p>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Support</p>
                <p className="mt-1 text-sm leading-[1.7] text-white/72">
                  Contact support@snasundaram.com for order or payment questions.
                </p>
              </div>
            </div>

            <Link
              to="/contactus"
              className="mt-8 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#0e3524] transition-all duration-300 hover:-translate-y-0.5"
            >
              Contact support
              <ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default TermsAndConditions;
