import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileLock2,
  ShieldCheck,
  UserRoundCheck,
  Database,
  Cookie,
  LockKeyhole,
  Mail,
} from "lucide-react";

const principles = [
  {
    icon: ShieldCheck,
    title: "Data minimization",
    text: "We collect only the information needed to process orders, support customers, and improve our services.",
  },
  {
    icon: LockKeyhole,
    title: "Secure payments",
    text: "Payment credentials are handled by trusted third-party gateways and are not stored on our servers.",
  },
  {
    icon: UserRoundCheck,
    title: "Customer rights",
    text: "You can contact us to access, correct, or delete information where applicable under law.",
  },
];

const sections = [
  {
    title: "1. Information we collect",
    body: [
      "We may collect your name, phone number, email address, delivery address, order details, and support messages when you place an order or contact us.",
      "If you make a payment, the payment gateway may also process transaction information needed to complete and verify the payment.",
    ],
  },
  {
    title: "2. How we use information",
    body: [
      "We use the information we collect to process orders, deliver products, respond to questions, provide customer support, and improve our website and services.",
      "We may also use contact information to share order updates, payment confirmations, service notices, and customer support communications.",
    ],
  },
  {
    title: "3. Payment information",
    body: [
      "Payments may be processed through third-party payment service providers such as Razorpay. These providers may collect and process payment-related data necessary to complete the transaction.",
      "We do not store card numbers, CVV codes, UPI PINs, or other sensitive payment instrument credentials on our servers.",
    ],
  },
  {
    title: "4. Sharing information",
    body: [
      "We may share limited customer information with payment gateways, shipping partners, logistics providers, and service providers who help us operate the business.",
      "We do not sell your personal information. Any sharing is limited to what is necessary for order fulfillment, payment processing, legal compliance, or customer support.",
    ],
  },
  {
    title: "5. Cookies and analytics",
    body: [
      "Our website may use cookies or similar technologies to remember preferences, improve website performance, and understand how visitors use the site.",
      "You can manage cookies through your browser settings, but some features of the website may not work properly if cookies are disabled.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We keep personal information only for as long as needed to fulfil the purposes described in this policy, comply with legal obligations, resolve disputes, and enforce agreements.",
      "When information is no longer required, we take reasonable steps to delete or anonymize it.",
    ],
  },
  {
    title: "7. Security",
    body: [
      "We use reasonable administrative and technical safeguards to protect personal information against unauthorized access, misuse, or disclosure.",
      "No online system is completely secure, but we work to minimize risk and use trusted payment and service providers where appropriate.",
    ],
  },
  {
    title: "8. Your choices",
    body: [
      "You may contact us to request access to, update, or correct your personal information, subject to applicable law.",
      "You may also opt out of non-essential promotional communications by using the unsubscribe option, where available, or by contacting us directly.",
    ],
  },
  {
    title: "9. Children's privacy",
    body: [
      "Our website is intended for general audiences and is not directed to children. We do not knowingly collect personal information from children without appropriate consent.",
    ],
  },
  {
    title: "10. Changes to this policy",
    body: [
      "We may update this Privacy Policy from time to time. The latest version posted on this page will govern how we use information.",
    ],
  },
  {
    title: "11. Contact us",
    body: [
      "For privacy questions or requests, please contact support@snasundaram.com or call +91 84386 60669.",
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#f4f7f5] text-[#303530]">
      <section className="relative mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 md:px-10 lg:px-[clamp(42px,5vw,84px)] lg:py-16 xl:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(7,148,71,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(9,107,53,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.42),transparent_42%)]" />

        <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2a1e_0%,#123627_55%,#0b5130_100%)] p-7 text-white shadow-[0_24px_60px_rgba(13,35,25,0.18)] sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[45px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

          <div className="relative z-10 max-w-[850px]">
            <div className="mb-5 flex items-center gap-2 text-[#7ee3a8]">
              <FileLock2 size={17} />
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em]">
                Privacy and data
              </p>
            </div>

            <h1 className="max-w-[750px] text-[clamp(36px,5vw,68px)] font-medium leading-[1.02] tracking-[-0.045em]">
              Privacy Policy
              <span className="block text-[#7ee3a8]">
                for SNA Sundaram.
              </span>
            </h1>

            <p className="mt-6 max-w-[680px] text-[15px] leading-[1.85] text-white/72 sm:text-[16px]">
              This policy explains what customer information we collect, how we
              use it, and how we protect it during browsing, checkout, and support.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {principles.map((item) => {
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
              <Database size={18} />
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em]">
                How we handle data
              </p>
            </div>

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
              Checkout ready
            </p>
            <h2 className="mt-3 text-[clamp(28px,3vw,40px)] font-medium leading-[1.08] tracking-[-0.03em]">
              Built for payment transparency.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.85] text-white/75">
              This page clearly states that payment data is processed by trusted
              partners such as Razorpay and that sensitive card details are not
              stored on our servers.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[22px] bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Contact data</p>
                <p className="mt-1 text-sm leading-[1.7] text-white/72">
                  Used for order updates, support, and fulfillment.
                </p>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Cookies</p>
                <p className="mt-1 text-sm leading-[1.7] text-white/72">
                  Used for site performance and preference handling.
                </p>
              </div>
              <div className="rounded-[22px] bg-white/8 p-4 backdrop-blur">
                <p className="text-sm font-semibold">Support</p>
                <p className="mt-1 text-sm leading-[1.7] text-white/72">
                  Reach us at support@snasundaram.com for privacy requests.
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

        <div className="mt-6 rounded-[30px] border border-white/70 bg-white p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.05)] sm:p-8">
          <div className="flex items-center justify-center gap-2 text-[#079447]">
            <Cookie size={16} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em]">
              Last updated
            </p>
          </div>
          <p className="mt-3 text-[15px] leading-[1.8] text-[#5e5e5e]">
            This page can be updated as our payment tools, shipping process, or
            legal requirements change.
          </p>
        </div>
      </section>
    </main>
  );
};

export default PrivacyPolicy;
