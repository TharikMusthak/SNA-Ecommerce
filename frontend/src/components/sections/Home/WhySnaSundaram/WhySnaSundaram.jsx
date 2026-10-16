 
import Tinyleaf from "@assets/images/tinyleaf.svg";

import cardleaf from "@assets/images/cardleaf.png";
import ingredients from "@assets/images/ingredients.png";
import noadditives from "@assets/images/noadditives.png";
import badge from "@assets/images/badge.png";

import HoneyImage from "@assets/images/why-sna-honey.png";

const features = [
  {
    id: 1,
    icon: cardleaf,
    title: "100%",
    subtitle: "Homemade",
  },
  {
    id: 2,
    icon:  ingredients,
    title: "Natural",
    subtitle: "Ingredients",
  },
  {
    id: 3,
    icon: noadditives,
    title: "No Artificial",
    subtitle: "Preservatives",
  },
  {
    id: 4,
    icon: badge,
    title: "FSSAI",
    subtitle: "Certified",
  },
];

const WhySnaSundaram = () => {
  return (
    <section className="relative w-full overflow-hidden bg-[#fcfcfc]">
      {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}
      <div
        className="
          relative
          mx-auto
          grid
          min-h-[520px]
          w-full
          max-w-[1600px]
          grid-cols-[minmax(0,1fr)_clamp(108px,31vw,501px)]
          items-start
          py-14

          sm:py-16

          md:py-20

          lg:min-h-[620px]
          lg:items-center
        "
      >

        {/* =====================================================
            LEFT CONTENT
        ====================================================== */}
        <div
          className="
            relative
            z-10
            min-w-0
            w-full
            pl-5

            sm:pl-8

            md:pl-10

            lg:pl-[clamp(42px,5vw,84px)]

            xl:pl-12
          "
        >

          {/* =================================================
              SMALL HEADING
          ================================================== */}
          <div className="mb-2 flex items-center gap-1">
                      <span
                        className="
                            pointer-events-none
          
                          text-[clamp(17px,1.35vw,21px)]
                          font-bold
                          leading-none
                          text-[#3d3d3d]
                        "
                      >
                       Why SNA Sundaram?
                      </span>
          
                      <img
                        className="h-auto w-[17px]"
                      alt="Tiny leaf"
                        aria-hidden="true"
                        src={Tinyleaf}
                      />
                        
                    </div>


          {/* =================================================
              MAIN HEADING
          ================================================== */}
          <h3
            className="
             text-[clamp(32px,3vw,46px)]
              font-normal
              leading-[1.12]
              tracking-[-0.025em]
              text-[#3f3f3f]
            "
          >
            Made with Care. Loved by Every Family.
          </h3>


          {/* =================================================
              DESCRIPTION
          ================================================== */}
          <p
            className="
               mt-7
              max-w-[560px]
              text-[clamp(15px,1.2vw,18px)]
              leading-[1.45]
              text-[#414141]

              sm:mt-8
            "
          >
            We believe healthy food begins with honest ingredients
            and traditional preparation methods.
          </p>


          {/* =================================================
              FEATURE CARDS
          ================================================== */}
          <div
            className="
              mt-7
              grid
              w-full
              grid-cols-2
              gap-3

              min-[400px]:gap-4

              sm:mt-9
              sm:grid-cols-4
              sm:gap-4

              sm:max-w-[560px]
              lg:max-w-[550px]
              lg:gap-5
            "
          >
            {features.map((feature) => {
 
              return (
                <div
                  key={feature.id}
                  className="
                    flex
                    min-h-[124px]
                    w-full
                    flex-col
                    items-center
                    justify-center
                    rounded-[14px]
                    bg-white
                    px-2
                    text-center

                    shadow-[0_3px_14px_rgba(0,0,0,0.07)]

                    transition-all
                    duration-300

                    hover:-translate-y-1
                    hover:shadow-[0_8px_22px_rgba(0,0,0,0.10)]

                    sm:min-h-[132px]

                    md:min-h-[132px]

                    lg:min-h-[132px]
                  "
                >

                  {/* ICON */}
                  <div
                    className="
                      mb-2
                      flex
                      h-12
                      w-12
                      items-center
                      justify-center

                      sm:mb-3
                      sm:h-14
                      sm:w-14
                    "
                  >
                    <img
                      src={feature.icon}
                      alt={feature.title}
                          
                      className="
                        h-11
                        w-11
                        object-contain
 
                        sm:h-12
                        sm:w-12
                      "
                      strokeWidth={1.8}
                    />
                  </div>


                  {/* TITLE */}
                  <p
                    className="
                      text-[10px]
                      font-medium
                      leading-[1.2]
                      text-[#555]

                      min-[400px]:text-[11px]

                      sm:text-[13px]
                    "
                  >
                    {feature.title}
                  </p>


                  {/* SUBTITLE */}
                  <p
                    className="
                      text-[10px]
                      leading-[1.2]
                      text-[#555]

                      min-[400px]:text-[11px]

                      sm:text-[13px]
                    "
                  >
                    {feature.subtitle}
                  </p>

                </div>
              );
            })}
          </div>
        </div>


        {/* =====================================================
            RESPONSIVE HONEY IMAGE
        ====================================================== */}
        <div
          className="
            relative
            flex
            h-full
            items-end
            justify-end
            pr-0
          "
        >
          <img
            src={HoneyImage}
            alt="SNA Sundaram homemade honey"
            className="
              block
              h-auto
              w-full
              max-w-[501px]
              object-contain
            "
          />
        </div>

      </div>
    </section>
  );
};

export default WhySnaSundaram;
