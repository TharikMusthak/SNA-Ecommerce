import {
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

import {
  FaInstagram,
  FaFacebookF,
} from "react-icons/fa";
import Logo from "../../../assets/images/Navbar/snaNavbarLogo.svg";
import footerImage from "../../../assets/images/Footer/footer.svg";
import { Link } from "react-router-dom";

const Footer = () => {
  const quickLinks = [
    { label: "Home", href: "/" },
    { label: "Our Story", href: "/ourstory" },
    { label: "Products", href: "/products" },
    { label: "Contact Us", href: "/contactus" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
    { label: "Privacy Policy", href: "/privacy-policy" },
  ];

  const products = [
    {
      label: "Garlic with Honey",
      href: "/products",
    },
    {
      label: "Black Sesame Laddu",
      href: "/products",
    },
    {
      label: "Karuppu Ulundhu Laddu",
      href: "/products",
    },
    {
      label: "Ulundhu Idiyappam Flour",
      href: "/products",
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-white">

      {/* =====================================================
          MAIN FOOTER
      ====================================================== */}
      <div className="relative mx-auto w-[100vw] px-6 pb-14 pt-16 sm:px-8 lg:px-12 xl:px-16">

        {/* Botanical Background */}


        {/* Content */}
        <div className="relative z-10 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.8fr_0.8fr_1.1fr_1.2fr] lg:gap-10 xl:gap-16">

          {/* =================================================
              BRAND
          ================================================== */}
          <div className="max-w-[560px]">

            {/* Logo */}
            <Link
              to="/"
              className="inline-block"
              aria-label="SNA Sundaram"
            >
              <div className="leading-none">

                <div className="flex items-end">
                  <img src={Logo} alt="SNA Sundaram Logo" />

                </div>



              </div>
            </Link>

            {/* Description */}
            <p className="mt-7 max-w-[530px] text-[17px] leading-[1.55] text-[#444444] sm:text-[18px]">
              Experience healthy, homemade foods prepared with
              care and delivered fresh to your doorstep.
            </p>

            {/* Social */}
            <div className="mt-5">
              <p className="mb-2 text-[17px] font-semibold text-[#444444]">
                Follow us on
              </p>

              <div className="flex items-center gap-2">

                <Link
                  to="#"
                  aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0B9B47] text-white transition duration-200 hover:-translate-y-1 hover:bg-[#087d3a]"
                >
                  <FaInstagram size={19} strokeWidth={2.2} />
                </Link>

                <Link
                  to="#"
                  aria-label="Facebook"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0B9B47] text-white transition duration-200 hover:-translate-y-1 hover:bg-[#087d3a]"
                >
                  <FaFacebookF
                    size={19}
                    strokeWidth={2.2}
                    fill="currentColor"
                  />
                </Link>

              </div>
            </div>
          </div>

          {/* =================================================
              QUICK LINKS
          ================================================== */}
          <div>
            <h3 className="text-[20px] font-bold text-[#079447]">
              Quick Links
            </h3>

            <ul className="mt-5 space-y-4">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-[16px] text-[#444444] transition-colors duration-200 hover:text-[#079447]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* =================================================
              PRODUCTS
          ================================================== */}
          <div>
            <h3 className="text-[20px] font-bold text-[#079447]">
              Products
            </h3>

            <ul className="mt-5 space-y-4">
              {products.map((product) => (
                <li key={product.label}>
                  <Link
                    to={product.href}
                    className="text-[16px] leading-6 text-[#444444] transition-colors duration-200 hover:text-[#079447]"
                  >
                    {product.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* =================================================
              CONTACT
          ================================================== */}
          <div>
            <h3 className="text-[20px] font-bold text-[#079447]">
              Contact
            </h3>

            <div className="mt-5 space-y-5">

              {/* Address */}
              <Link
                to="#"
                className="group flex items-start gap-2.5"
              >
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-[#079447]"
                  strokeWidth={2.5}
                />

                <span className="text-[16px] leading-6 text-[#444444] transition-colors group-hover:text-[#079447]">
                  Tisaiyanvilai, Tirunelveli
                </span>
              </Link>

              {/* Phone */}
              <Link
                to="tel:+918438660669"
                className="group flex items-center gap-2.5"
              >
                <Phone
                  size={17}
                  className="shrink-0 text-[#079447]"
                  strokeWidth={2.5}
                />

                <span className="text-[16px] text-[#444444] transition-colors group-hover:text-[#079447]">
                  +91 84386 60669
                </span>
              </Link>

              {/* Email */}
              <Link
                to="mailto:support@snasundaram.com"
                className="group flex items-start gap-2.5"
              >
                <Mail
                  size={17}
                  className="mt-1 shrink-0 text-[#079447]"
                  strokeWidth={2.5}
                />

                <span className="break-all text-[16px] leading-6 text-[#444444] transition-colors group-hover:text-[#079447]">
                  support@snasundaram.com
                </span>
              </Link>

            </div>
          </div>

        </div>
      </div>

      {/* =====================================================
          COPYRIGHT
      ====================================================== */}
      <div className="relative z-20 mx-auto max-w-[1660px] px-6 sm:px-8 lg:px-12 xl:px-16">

        <div className="border-t border-gray-300 py-5">

          <div className="flex flex-col gap-3 text-[14px] text-[#444444] sm:flex-row sm:items-center sm:justify-between sm:text-[15px]">

            <p>
              Copyright @SNA Sundaram. All Rights Reserved
            </p>

            <p>
              Designed by{" "}
              <Link
                to="#"
                className="font-medium hover:text-[#079447]"
              >
                <span className="text-[#19b253]">H</span>int Technologies
              </Link>
            </p>

          </div>

        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[270px] "
        aria-hidden="true"
      >

        <LeafBranch />


      </div>

    </footer>
  );
};


/* =========================================================
   SIMPLE DECORATIVE LEAF BRANCH
========================================================= */

const LeafBranch = () => {
  return (


    <img
      src={footerImage}
      alt="Leaf Branch"
      className="h-full w-full"
    />


  );
};

export default Footer;
