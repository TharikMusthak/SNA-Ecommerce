import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFaqs } from "@api/faq.api";
import TinyLeaf from "@assets/images/tinyleaf.svg";
import PalmImage from "@assets/images/leaf1.png";
import BananaLeaves from "@assets/images/banana-leaves.png";
import Spinner from "@components/ui/Spinner/Spinner";
import { QUERY_KEYS } from "@config/constants";

const FAQ = () => {
  const [openId, setOpenId] = useState(null);
  const faqs = useQuery({
    queryKey: QUERY_KEYS.faqs,
    queryFn: async () => {
      const response = await getFaqs();
      const payload = response.data?.data ?? response.data ?? [];
      return Array.isArray(payload) ? payload : payload.items || [];
    },
  });
  const faqData = faqs.data || [];

  const toggleFAQ = (id) => {
    setOpenId((currentId) => (currentId === id ? null : id));
  };

  return (
    <section
      className="
        relative
        w-full
        md:min-h-[620px]
        overflow-hidden
        bg-white

        px-4
        py-14

        sm:px-6
        sm:py-16

        md:px-8
        md:py-20

        lg:px-10
        lg:py-24
      "
    >
      {/* =====================================================
          LEFT DECORATIVE LEAF
      ====================================================== */}

      <img
        src={PalmImage}
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          z-0

          hidden
          w-[180px]
          opacity-90

          md:block
          md:w-[210px]

          lg:w-[250px]

          xl:w-[300px]
        "
      />

      {/* =====================================================
          RIGHT DECORATIVE LEAVES
      ====================================================== */}

      <img
        src={BananaLeaves}
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-0
          right-[-12px]
          z-0

          hidden
          w-[190px]
          object-contain

          md:block
          md:w-[230px]

          lg:w-[280px]

          xl:w-[330px]
        "
      />

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-[1100px]
        "
      >
        {/* ===================================================
            TITLE
        ==================================================== */}

        <div className="text-center">
          <div
            className="
              inline-flex
              items-center
              justify-center
              gap-1
            "
          >
            <h2
              className="
                text-[28px]
                font-normal
                leading-tight
                tracking-[-0.02em]
                text-[#3d3d3d]

                sm:text-[34px]

                md:text-[40px]

                lg:text-[44px]
              "
            >
              Frequently Asked Questions
            </h2>

            <img
              src={TinyLeaf}
              alt=""
              aria-hidden="true"
              className="
                mt-1
                h-auto
                w-[16px]

                sm:w-[18px]

                md:w-[20px]
              "
            />
          </div>
        </div>

        {/* ===================================================
            FAQ LIST
        ==================================================== */}

        <div
          className="
            mx-auto
            mt-10
            w-full
            max-w-[770px]

            sm:mt-12

            md:mt-14
          "
        >
          <div className="max-h-[440px] space-y-4 overflow-y-auto overscroll-contain pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[470px]">
            {faqs.isLoading && (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            )}
            {!faqs.isLoading && !faqData.length && (
              <p className="rounded-[14px] bg-[#f5f5f5] px-5 py-8 text-center text-sm text-gray-500">
                FAQs will be available soon.
              </p>
            )}
            {faqData.map((item, index) => {
              const itemId = item.id ?? index;
              const isOpen = openId === itemId;

              return (
                <div
                  key={itemId}
                  className="
                    overflow-hidden
                    rounded-[14px]
                    bg-[#f5f5f5]

                    transition-all
                    duration-300
                  "
                >
                  {/* =================================================
                      QUESTION
                  ================================================== */}

                  <button
                    type="button"
                    onClick={() => toggleFAQ(itemId)}
                    aria-expanded={isOpen}
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-4

                      px-5
                      py-4

                      text-left

                      sm:px-6
                      sm:py-5

                      md:px-6
                      md:py-5
                    "
                  >
                    <span
                      className="
                        text-[16px]
                        font-semibold
                        leading-tight
                        text-[#444]

                        sm:text-[17px]

                        md:text-[18px]

                        lg:text-[19px]
                      "
                    >
                      {item.question || item.title}
                    </span>

                    {/* =================================================
                        ARROW
                    ================================================== */}

                    <span
                      className="
                        flex
                        h-6
                        w-6
                        shrink-0
                        items-center
                        justify-center
                      "
                    >
                      <span
                        className={`
                          block
                          h-0
                          w-0

                          border-l-[9px]
                          border-r-[9px]
                          border-l-transparent
                          border-r-transparent

                          transition-transform
                          duration-300

                          ${
                            isOpen
                              ? "rotate-180 border-t-0 border-b-[12px] border-b-[#079447]"
                              : "border-t-[12px] border-t-[#079447]"
                          }
                        `}
                      />
                    </span>
                  </button>

                  {/* =================================================
                      ANSWER
                  ================================================== */}

                  <div
                    className={`
                      grid
                      transition-all
                      duration-300
                      ease-in-out

                      ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }
                    `}
                  >
                    <div className="overflow-hidden">
                      <div
                        className="
                          mx-5
                          border-t
                          border-[#e4e4e4]

                          px-0
                          py-4

                          sm:mx-6
                          sm:py-5
                        "
                      >
                        <p
                          className="
                            text-[14px]
                            leading-[1.6]
                            text-[#444]

                            sm:text-[15px]

                            md:text-[16px]
                          "
                        >
                          {item.answer || item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
