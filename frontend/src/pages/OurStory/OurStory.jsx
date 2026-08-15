import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Heart,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";
import Tinyleaf from "@assets/images/tinyleaf.svg";

const values = [
  {
    icon: Heart,
    title: "Made with Care",
    text: "Every product begins with the same care and thoughtfulness we would want for our own family.",
  },
  {
    icon: Leaf,
    title: "Rooted in Tradition",
    text: "We draw inspiration from familiar ingredients and food traditions that have been part of Indian homes for generations.",
  },
  {
    icon: ShieldCheck,
    title: "Quality First",
    text: "We believe everyday food should be made with ingredients and processes we can confidently stand behind.",
  },
];

const storyPoints = [
  "Created for our own family first",
  "Inspired by familiar Indian ingredients",
  "Designed for everyday wellness",
  "Made to fit naturally into modern lifestyles",
];

const OurStory = () => {
  return (
    <main className="w-full overflow-hidden bg-[#fafcfb] text-[#303530]">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative">
        {/* Background */}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(7,148,71,0.10),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(7,148,71,0.07),transparent_30%)]" />

        <div
          className="
            relative
            mx-auto
            flex
            min-h-[560px]
            max-w-[1450px]
            flex-col
            items-center
            justify-center
            px-5
            py-20
            text-center

            sm:px-8
            sm:py-24

            lg:min-h-[650px]
            lg:px-12
          "
        >
          {/* Small label */}

          <div className="mb-7 flex items-center gap-2">
            <span className="h-px w-8 bg-[#079447]" />

            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.28em]
                text-[#079447]
              "
            >
              The SNA Sundaram Story
            </p>

            <span className="h-px w-8 bg-[#079447]" />
          </div>

          {/* Logo */}

          <div
            className="
              mb-8
              flex
              items-center
              justify-center
              rounded-[24px]
              border
              border-[#079447]/10
              bg-white
              px-7
              py-5
              shadow-[0_15px_45px_rgba(0,0,0,0.06)]
            "
          >
            <img
              src={Logo}
              alt="SNA Sundaram"
              className="
                h-auto
                w-[145px]
                object-contain

                sm:w-[170px]
              "
            />
          </div>

          {/* Heading */}

          <h1
            className="
              max-w-[950px]
              text-[42px]
              font-normal
              leading-[1.05]
              tracking-[-0.04em]
              text-[#252a27]

              sm:text-[54px]

              md:text-[64px]

              lg:text-[78px]
            "
          >
            Good food begins with
            <span className="text-[#079447]"> good intentions.</span>
          </h1>

          {/* Description */}

          <p
            className="
              mt-7
              max-w-[720px]
              text-[15px]
              leading-[1.85]
              text-[#626862]

              sm:text-[16px]
            "
          >
            SNA Sundaram began at home with a simple thought — everyday food
            should be wholesome, familiar, and made with care. What started
            as a choice for our own family slowly became a purpose we wanted
            to share with others.
          </p>

          {/* Tagline */}

          <div
            className="
              mt-8
              flex
              items-center
              gap-2
              text-[11px]
              font-medium
              uppercase
              tracking-[0.22em]
              text-[#079447]
            "
          >
            <span>Pure</span>
            <span>•</span>
            <span>Healthy</span>
            <span>•</span>
            <span>Homemade</span>

            <img
              src={Tinyleaf}
              alt=""
              aria-hidden="true"
              className="ml-1 w-4"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          INTRODUCTION
      ====================================================== */}

      <section className="border-y border-black/5 bg-white">
        <div
          className="
            mx-auto
            grid
            max-w-[1250px]
            gap-12
            px-5
            py-16

            sm:px-8
            sm:py-20

            lg:grid-cols-[0.8fr_1.2fr]
            lg:items-center
            lg:px-10
            lg:py-24
          "
        >
          {/* Left */}

          <div>
            <div className="flex items-center gap-2">
              <Sparkles
                size={17}
                className="text-[#079447]"
              />

                <span
                           className="
                               pointer-events-none
             
                             text-[clamp(22px,1.8vw,27px)]
                             font-bold
                             leading-none
                             text-[#3d3d3d]
                           "
                         >
                          Who We Are
                         </span>
             
                         <img
                           className="h-auto w-[17px]"
                         alt="Tiny leaf"
                           aria-hidden="true"
                           src={Tinyleaf}
                         />
            </div>

            <h2
              className="
                mt-5
                max-w-[430px]
                text-[34px]
                font-normal
                leading-[1.12]
                tracking-[-0.03em]
                text-[#282d29]

                sm:text-[42px]

                lg:text-[48px]
              "
            >
              From our family to yours.
            </h2>
          </div>

          {/* Right */}

          <div>
            <p
              className="
                text-[16px]
                leading-[1.9]
                text-[#555c56]

                sm:text-[17px]
              "
            >
              SNA Sundaram is a family-led brand built around a simple belief:
              healthier choices should not feel complicated. Our journey began
              inside our own home, where we wanted better alternatives to
              everyday junk food and snacks.
            </p>

            <p
              className="
                mt-5
                text-[16px]
                leading-[1.9]
                text-[#555c56]

                sm:text-[17px]
              "
            >
              Over time, the preparations we made for our family became part
              of our everyday routine. They were familiar, comforting, and
              made us feel confident about what we were bringing to the table.
              That experience became the foundation for SNA Sundaram.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          OUR BEGINNING
      ====================================================== */}

      <section className="bg-[#f3f7f4]">
        <div
          className="
            mx-auto
            max-w-[1250px]
            px-5
            py-16

            sm:px-8
            sm:py-20

            lg:px-10
            lg:py-24
          "
        >
          {/* Section heading */}
<div>
            <div className="flex items-center gap-2">
              <Sparkles
                size={17}
                className="text-[#079447]"
              />

                <span
                           className="
                               pointer-events-none
             
                             text-[clamp(22px,1.8vw,27px)]
                             font-bold
                             leading-none
                             text-[#3d3d3d]
                           "
                         >
                         How It All Began
                         </span>
             
                         <img
                           className="h-auto w-[17px]"
                         alt="Tiny leaf"
                           aria-hidden="true"
                           src={Tinyleaf}
                         />
            </div>
            </div>
          <div className="max-w-[700px]">
              

            <h2
              className="
                mt-4
                text-[34px]
                font-normal
                leading-[1.1]
                tracking-[-0.03em]
                text-[#292e2b]

                sm:text-[44px]

                lg:text-[52px]
              "
            >
              A simple idea,
              <br />
              started at home.
            </h2>

            <p
              className="
                mt-5
                max-w-[680px]
                text-[15px]
                leading-[1.85]
                text-[#626962]

                sm:text-[16px]
              "
            >
              We started by making healthier snacks for our own family and
              keeping better options available at home. There was no grand
              plan at the beginning — just a genuine need for food we could
              feel good about serving.
            </p>
          </div>

          {/* Story timeline */}

          <div
            className="
              mt-12
              grid
              gap-4

              md:grid-cols-3
            "
          >
            {/* 01 */}

            <article
              className="
                rounded-[28px]
                border
                border-black/5
                bg-white
                p-6
                shadow-[0_12px_35px_rgba(0,0,0,0.04)]

                sm:p-7
              "
            >
              <span
                className="
                  text-[11px]
                  font-bold
                  tracking-[0.2em]
                  text-[#079447]
                "
              >
                01
              </span>

              <h3
                className="
                  mt-5
                  text-[22px]
                  font-semibold
                  text-[#292e2b]
                "
              >
                It began at home
              </h3>

              <p
                className="
                  mt-4
                  text-[15px]
                  leading-[1.8]
                  text-[#626862]
                "
              >
                We wanted something better than routine junk food — something
                simple, honest, and nourishing enough to become part of our
                everyday life.
              </p>
            </article>

            {/* 02 */}

            <article
              className="
                rounded-[28px]
                border
                border-black/5
                bg-white
                p-6
                shadow-[0_12px_35px_rgba(0,0,0,0.04)]

                sm:p-7
              "
            >
              <span
                className="
                  text-[11px]
                  font-bold
                  tracking-[0.2em]
                  text-[#079447]
                "
              >
                02
              </span>

              <h3
                className="
                  mt-5
                  text-[22px]
                  font-semibold
                  text-[#292e2b]
                "
              >
                Built around care
              </h3>

              <p
                className="
                  mt-4
                  text-[15px]
                  leading-[1.8]
                  text-[#626862]
                "
              >
                As our family continued using these preparations, they became
                more than food. They became thoughtful choices for busy days,
                family routines, and everyday moments.
              </p>
            </article>

            {/* 03 */}

            <article
              className="
                rounded-[28px]
                border
                border-black/5
                bg-white
                p-6
                shadow-[0_12px_35px_rgba(0,0,0,0.04)]

                sm:p-7
              "
            >
              <span
                className="
                  text-[11px]
                  font-bold
                  tracking-[0.2em]
                  text-[#079447]
                "
              >
                03
              </span>

              <h3
                className="
                  mt-5
                  text-[22px]
                  font-semibold
                  text-[#292e2b]
                "
              >
                Rooted in tradition
              </h3>

              <p
                className="
                  mt-4
                  text-[15px]
                  leading-[1.8]
                  text-[#626862]
                "
              >
                Traditional ingredients such as garlic, honey, and ellu-based
                recipes became an important part of our journey and continue
                to inspire what we create.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* =====================================================
          OUR PHILOSOPHY
      ====================================================== */}

      <section className="bg-white">
        <div
          className="
            mx-auto
            grid
            max-w-[1250px]
            gap-12
            px-5
            py-16

            sm:px-8
            sm:py-20

            lg:grid-cols-[1fr_1fr]
            lg:items-center
            lg:px-10
            lg:py-24
          "
        >
          {/* Text */}

          <div>
           <div>
            <div className="flex items-center gap-2">
              <Sparkles
                size={17}
                className="text-[#079447]"
              />

                <span
                           className="
                               pointer-events-none
             
                             text-[clamp(22px,1.8vw,27px)]
                             font-bold
                             leading-none
                             text-[#3d3d3d]
                           "
                         >
              What We Believe
                         </span>
             
                         <img
                           className="h-auto w-[17px]"
                         alt="Tiny leaf"
                           aria-hidden="true"
                           src={Tinyleaf}
                         />
            </div>
            </div>

            <h2
              className="
                mt-5
                max-w-[560px]
                text-[35px]
                font-normal
                leading-[1.12]
                tracking-[-0.03em]
                text-[#292e2b]

                sm:text-[44px]

                lg:text-[52px]
              "
            >
              Better choices can begin with everyday habits.
            </h2>

            <p
              className="
                mt-5
                max-w-[580px]
                text-[15px]
                leading-[1.9]
                text-[#626862]

                sm:text-[16px]
              "
            >
              We believe food does not have to be complicated to be good.
              Sometimes the most meaningful changes begin with small,
              consistent choices at home.
            </p>

            {/* Points */}

            <div className="mt-8 space-y-4">
              {storyPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-3"
                >
                  <span
                    className="
                      grid
                      h-6
                      w-6
                      shrink-0
                      place-items-center
                      rounded-full
                      bg-[#079447]/10
                      text-[#079447]
                    "
                  >
                    <Check
                      size={14}
                      strokeWidth={2.5}
                    />
                  </span>

                  <p className="text-[15px] text-[#444a45]">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quote panel */}

          <div
            className="
              relative
              overflow-hidden
              rounded-[34px]
              bg-[#0e3524]
              p-7
              text-white

              sm:p-10

              lg:min-h-[430px]
            "
          >
            {/* Decorative circle */}

            <div
              className="
                pointer-events-none
                absolute
                -right-24
                -top-24
                h-64
                w-64
                rounded-full
                border-[35px]
                border-white/5
              "
            />

            <div
              className="
                pointer-events-none
                absolute
                -bottom-32
                -left-24
                h-72
                w-72
                rounded-full
                border-[40px]
                border-white/5
              "
            />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div
                  className="
                    grid
                    h-12
                    w-12
                    place-items-center
                    rounded-full
                    bg-white/10
                  "
                >
                  <Heart
                    size={20}
                    fill="currentColor"
                  />
                </div>

                <p
                  className="
                    mt-8
                    max-w-[520px]
                    text-[28px]
                    font-normal
                    leading-[1.35]
                    tracking-[-0.02em]

                    sm:text-[34px]
                  "
                >
                  “We started making these products for our family. Sharing
                  that same care with yours is what makes SNA Sundaram
                  meaningful.”
                </p>
              </div>

              <div className="mt-10">
                <div className="h-px w-12 bg-[#5dd08d]" />

                <p
                  className="
                    mt-4
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.22em]
                    text-white/60
                  "
                >
                  The SNA Sundaram philosophy
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          VALUES
      ====================================================== */}

      <section className="bg-[#f3f7f4]">
        <div
          className="
            mx-auto
            max-w-[1250px]
            px-5
            py-16

            sm:px-8
            sm:py-20

            lg:px-10
            lg:py-24
          "
        >
          <div className="text-center">
        <div className="flex items-center  justify-center gap-2">
              

                <span
                           className="
                               pointer-events-none
             
                             text-[clamp(22px,1.8vw,27px)]
                             font-bold
                             leading-none
                             text-[#3d3d3d]
                           "
                         >
                          Our Values
                         </span>
             
                         <img
                           className="h-auto w-[17px]"
                         alt="Tiny leaf"
                           aria-hidden="true"
                           src={Tinyleaf}
                         />
            </div>

            <h2
              className="
                mx-auto
                mt-4
                max-w-[650px]
                text-[34px]
                font-normal
                leading-[1.1]
                tracking-[-0.03em]
                text-[#292e2b]

                sm:text-[44px]
              "
            >
              The principles behind everything we make.
            </h2>
          </div>

          <div
            className="
              mt-12
              grid
              gap-4

              md:grid-cols-3
            "
          >
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="
                    rounded-[28px]
                    border
                    border-black/5
                    bg-white
                    p-7
                    text-center
                    shadow-[0_12px_35px_rgba(0,0,0,0.04)]

                    sm:p-8
                  "
                >
                  <div
                    className="
                      mx-auto
                      grid
                      h-14
                      w-14
                      place-items-center
                      rounded-full
                      bg-[#079447]/10
                      text-[#079447]
                    "
                  >
                    <Icon
                      size={23}
                      strokeWidth={1.7}
                    />
                  </div>

                  <h3
                    className="
                      mt-6
                      text-[20px]
                      font-semibold
                      text-[#292e2b]
                    "
                  >
                    {item.title}
                  </h3>

                  <p
                    className="
                      mt-3
                      text-[14px]
                      leading-[1.8]
                      text-[#626862]
                    "
                  >
                    {item.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          PROMISE
      ====================================================== */}

      <section className="bg-white">
        <div
          className="
            mx-auto
            max-w-[1000px]
            px-5
            py-20
            text-center

            sm:px-8
            sm:py-24

            lg:py-28
          "
        >
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-[#079447]" />

            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.24em]
                text-[#079447]
              "
            >
              Our Promise
            </p>

            <span className="h-px w-8 bg-[#079447]" />
          </div>

          <h2
            className="
              mt-6
              text-[36px]
              font-normal
              leading-[1.12]
              tracking-[-0.035em]
              text-[#292e2b]

              sm:text-[48px]

              lg:text-[58px]
            "
          >
            Simple food.
            <br />
            <span className="text-[#079447]">
              Thoughtfully made.
            </span>
          </h2>

          <p
            className="
              mx-auto
              mt-6
              max-w-[650px]
              text-[15px]
              leading-[1.9]
              text-[#626862]

              sm:text-[16px]
            "
          >
            Our promise is to keep every product rooted in care, tradition,
            and the belief that healthier choices should still feel familiar,
            enjoyable, and easy to make part of everyday life.
          </p>

          {/* CTA */}

          <div
            className="
              mt-9
              flex
              flex-col
              items-center
              justify-center
              gap-3

              sm:flex-row
            "
          >
            <Link
              to="/products"
              className="
                group
                inline-flex
                min-h-[50px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-full
                bg-[#079447]
                px-8
                text-[14px]
                font-semibold
                text-white
                shadow-[0_10px_25px_rgba(7,148,71,0.18)]
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:bg-[#06753a]

                sm:w-auto
              "
            >
              Explore Our Products

              <ArrowRight
                size={17}
                className="
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />
            </Link>

            <Link
              to="/contactus"
              className="
                inline-flex
                min-h-[50px]
                w-full
                items-center
                justify-center
                rounded-full
                border
                border-[#079447]/20
                px-8
                text-[14px]
                font-semibold
                text-[#079447]
                transition-all
                duration-300
                hover:bg-[#079447]/5

                sm:w-auto
              "
            >
              Get in Touch
            </Link>
          </div>

          {/* Bottom tagline */}

          <div
            className="
              mt-12
              flex
              items-center
              justify-center
              gap-2
              text-[10px]
              font-medium
              uppercase
              tracking-[0.22em]
              text-gray-400
            "
          >
            <span>Pure</span>
            <span>•</span>
            <span>Healthy</span>
            <span>•</span>
            <span>Homemade</span>

            <img
              src={Tinyleaf}
              alt=""
              aria-hidden="true"
              className="ml-1 w-3"
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default OurStory;