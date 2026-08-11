 
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
    <section className="relative w-full overflow-hidden bg-white">
      {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}
      <div
        className="
          relative
          mx-auto
          flex
          min-h-[560px]
          w-full
          max-w-[1500px] 
          h-[90vh]
           flex-col
          items-center

          px-5
          py-14

          sm:px-8
          sm:py-16

          md:px-10
          md:py-20

          lg:flex-row
          lg:items-center
          lg:px-10
          lg:py-20

          xl:px-12
        "
      >

        {/* =====================================================
            LEFT CONTENT
        ====================================================== */}
        <div
          className="
            relative
            z-10
            w-full

            lg:w-[58%]

            xl:w-[60%]
          "
        >

          {/* =================================================
              SMALL HEADING
          ================================================== */}
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
             text-[clamp(43px,3.3vw,56px)]
              font-regular
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
              max-w-[1050px]
              text-[clamp(15px,1.35vw,22px)]
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

              lg:max-w-[100%]
              lg:gap-5
            "
          >
            {features.map((feature) => {
 
              return (
                <div
                  key={feature.id}
                  className="
                    flex
                    h-[110px]
                    w-full
                    flex-col
                    items-center
                    justify-center
                    rounded-[12px]
                    bg-white
                    px-2
                    text-center

                    shadow-[0_3px_14px_rgba(0,0,0,0.07)]

                    transition-all
                    duration-300

                    hover:-translate-y-1
                    hover:shadow-[0_8px_22px_rgba(0,0,0,0.10)]

                    sm:h-[118px]

                    md:h-[120px]

                    lg:h-[118px]
                  "
                >

                  {/* ICON */}
                  <div
                    className="
                      mb-2
                      flex
                      h-40
                      w-40
                      items-center
                      justify-center

                      sm:mb-3
                      sm:h-10
                      sm:w-10
                    "
                  >
                    <img
                      src={feature.icon}
                      alt={feature.title}
                          
                      className="
                        h-40
                        w-40
 
                        sm:h-8
                        sm:w-8
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

                      sm:text-[12px]
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

                      sm:text-[12px]
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
            mt-10
            flex
            w-full
            justify-end

            sm:mt-12

            md:mt-14

            lg:absolute
            lg:right-0
            lg:bottom-0
            lg:mt-0
            lg:w-[45%]

            xl:w-[43%]
          "
        >
          <img
            src={HoneyImage}
            alt="SNA Sundaram homemade honey"
            className="
              block
              h-auto
              w-[90%]
              max-w-[501px]
              object-contain

              min-[400px]:w-[88%]

              sm:w-[75%]

              md:w-[65%]

              lg:w-[68%]
              lg:max-w-[501px]
            "
          />
        </div>

      </div>
    </section>
  );
};

export default WhySnaSundaram;