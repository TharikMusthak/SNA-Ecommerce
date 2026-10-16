import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import GarlicImage from "@assets/images/aboutGarlic.png";
import PaddyImage from "@assets/images/aboutPaddy.png";
import Tinyleaf from "@assets/images/tinyleaf.svg";

const AboutSection = () => {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);

          // Animate only the first time
          observer.unobserve(section);
        }
      },
      {
        threshold: 0.3,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden bg-white"
    >
      <div
        className="
          relative
          mx-auto
          flex
          min-h-[520px]
          w-full
          max-w-[1800px]
          items-center
          px-6
          py-20

          sm:min-h-[560px]
          sm:px-10

          md:min-h-[600px]  

          lg:min-h-[full]
          lg:px-16

          xl:px-20
          xl:w-[full]
        "
      >

        {/* =====================================================
            GARLIC
        ====================================================== */}

        <div
          className={`
            pointer-events-none
            absolute
            z-10

            left-[-70px]
            top-[-25%]
            w-[130px]

            xs:w-[0px]
sm:block
            sm:left-[-100px]
            sm:w-[280px]

            lg:left-[-55px]
            lg:top-[14%]
            lg:w-[406.56px]

            xl:left-[-5px]
            xl:top-[-4%]
            xl:w-[700px]

            ${
              isVisible
                ? "animate-about-garlic-in"
                : "-translate-x-[130%] opacity-0"
            }
          `}
        >
          <img
            src={GarlicImage}
            alt="Garlic Image "
      className="h-auto w-100  sm:block     "
          />
        </div>
            

        {/* =====================================================
            CONTENT
        ====================================================== */}

        <div
          className={`
            relative
            z-20
            mx-auto
            w-full
            max-w-[1150px]

            sm:ml-[30%]
            sm:mr-[12%]

            lg:ml-[31%]
            lg:mr-[12%]

            ${
              isVisible
                ? "animate-about-content-in"
                : "translate-y-8 opacity-0"
            }
          `}
        >

          {/* LABEL */}

          <div className="mb-2 flex items-center gap-1">
            <span
              className="
                  pointer-events-none

                text-[clamp(22px,1.8vw,27px)]
                font-bold
                leading-none
                text-[#3d3d3d]
              "
            >
              About Us
            </span>

            <img
              className="h-auto w-[17px]"
            alt="Tiny leaf"
              aria-hidden="true"
              src={Tinyleaf}
            />
              
          </div>

          {/* TITLE */}

          <h2
            className="
              text-[clamp(43px,3.3vw,56px)]
              font-regular
              leading-[1.12]
              tracking-[-0.025em]
              text-[#3f3f3f]
            "
          >
            Tradition You Can Taste
          </h2>

          {/* DESCRIPTION */}

          <p
            className="
              mt-7
              max-w-[1050px]
              text-[clamp(15px,1.35vw,22px)]
              leading-[1.45]
              text-[#414141]

              sm:mt-8
            "
          >
            At SNA Sundaram Products, every recipe is inspired by generations
            of traditional wisdom. We prepare wholesome, preservative-free
            foods using natural ingredients to deliver authentic flavor and
            everyday nutrition.
          </p>

          {/* BUTTON */}

          <Link
            to="/ourstory"
            className="
              mt-8
              inline-flex
              min-h-[48px]
              items-center
              justify-center
              rounded-full
              border
              border-[#3d3d3d]
              px-11
              text-[16px]
              font-medium
              text-[#3d3d3d]
              transition-all
              duration-300

              hover:border-[#079447]
              hover:bg-[#079447]
              hover:text-white

              sm:mt-9
            "
          >
            View More
          </Link>
        </div>

        {/* =====================================================
            PADDY / WHEAT
        ====================================================== */}

        <div
  className={`
    pointer-events-none
    absolute
    z-10

    /* Mobile */
    right-[-35px]
    bottom-[-10px]
    w-[155px]

    /* Small mobile */
    max-[480px]:right-[-25px]
    max-[480px]:bottom-[-5px]
    max-[480px]:w-[125px]

    /* Tablet */
    sm:right-[-40px]
    sm:bottom-[-15px]
    sm:w-[195px]

    /* Desktop */
    lg:right-[-35px]
    lg:bottom-[-15px]
    lg:w-[235px]

    /* Large desktop */
    xl:right-[-2px]
    xl:bottom-[-20px]
    xl:w-[281px]

    ${
      isVisible
        ? "animate-about-paddy-in"
        : "translate-x-[130%] opacity-0"
    }
  `}
>
  <div className="origin-bottom-right animate-paddy-wind">
    <img
      src={PaddyImage}
      alt="Paddy Image"
      className="h-auto w-100 object-contain"
    />
  </div>
</div>

      </div>
    </section>
  );
};

export default AboutSection;