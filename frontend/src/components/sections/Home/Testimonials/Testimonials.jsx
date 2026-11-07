import { useState, useRef, useEffect } from "react";
import api from "@api/axios";
import PalmImage from "@assets/images/palm.png";
 import cardleaf from "@assets/images/cardleaf.png";

import reviewLeft from "@assets/images/reviewLeft.png";
import reviewRight from "@assets/images/reviewRight.png";

function relativeTime(value) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) === 1 ? "" : "s"} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? "" : "s"} ago`;
}

function initials(name) {
  return String(name || "Customer")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
 

 
  /* ==========================================================
      AUTO SCROLL
  ========================================================== */

  

  const totalSlides = testimonials.length;

  useEffect(() => {
    let active = true;
    api.get("/reviews/home", { params: { limit: 12 } })
      .then((response) => {
        if (!active) return;
        const rows = response.data?.data ?? response.data ?? [];
        setTestimonials(Array.isArray(rows) ? rows.map((review) => ({
          id: review.id,
          name: review.reviewer || "Customer",
          rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
          review: review.review_text || review.title,
          time: relativeTime(review.created_at),
        })) : []);
      })
      .catch(() => {
        if (active) setTestimonials([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (totalSlides < 2) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4000);

    return () => clearInterval(interval);
  }, [totalSlides]);

  const nextSlide = () => {
    if (!totalSlides) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const previousSlide = () => {
    if (!totalSlides) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  /*
   * ==========================================================
   * MOBILE SWIPE
   * ==========================================================
   */

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance =
      touchStartX.current - touchEndX.current;

    const minimumSwipeDistance = 50;

    if (Math.abs(distance) > minimumSwipeDistance) {
      if (distance > 0) {
        nextSlide();
      } else {
        previousSlide();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  /*
   * ==========================================================
   * CARD POSITION
   * ==========================================================
   */

  const getCardPosition = (index) => {
    let difference = index - currentIndex;

    if (difference > totalSlides / 2) {
      difference -= totalSlides;
    }

    if (difference < -totalSlides / 2) {
      difference += totalSlides;
    }

    return difference;
  };

  return (
    <section
      className="
        relative
        w-full
        overflow-hidden
        bg-white
        px-5
        py-16

        sm:px-8
        sm:py-20

        lg:px-10
        lg:py-24
      "
    >
      {/* ======================================================
          LEFT PALM
      ======================================================= */}

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

          w-[full]
 
          sm:w-[180px]

          md:w-[230px]

          lg:w-screen

          xl:w-screen
        "
      />

      {/* ======================================================
          RIGHT PALM
      ======================================================= */}

      <img
        src={PalmImage}
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-0
          right-0
          z-0

          w-[130px]
          scale-x-[-1]
          opacity-[0.07]

          sm:w-[180px]

          md:w-[230px]

          lg:w-[280px]

          xl:w-[340px]
        "
      />

      {/* ======================================================
          MAIN CONTENT
      ======================================================= */}

      <div
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-[1450px]
        "
      >
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div
          className="
            flex
            items-start
            justify-between
          "
        >
          <div>
            {/* Small heading */}

            <div className="flex items-center gap-1">
            <span
                        className="
                            pointer-events-none
          
                          text-[clamp(17px,1.35vw,21px)]
                          font-bold
                          leading-none
                          text-[#3d3d3d]
                        "
                      >
                      Loved by Families
                      </span>
              

              <img
                src={cardleaf}
                alt=""
                aria-hidden="true"
                className="
                  h-auto
                  w-[14px]

                  sm:w-[16px]
                "
              />
            </div>

            {/* Main heading */}
  <h3
            className="
             text-[clamp(32px,3vw,46px)]
              font-normal
              leading-[1.12]
              tracking-[-0.025em]
              text-[#3f3f3f]
            "
          >
           Real Stories, Real Satisfaction
          </h3>
            
          </div>

          {/* ==================================================
              DESKTOP ARROWS
          =================================================== */}

          <div
            className="
              hidden
              items-center
              gap-3

              md:flex
            "
          >
            {/* Previous */}

            <img
              src={reviewLeft}
              onClick={previousSlide}
              aria-label="Previous testimonial"
              className="
                flex
                h-10
                w-10
                items-center
                justify-center"
            />
               

            {/* Next */}

            <img
              src={reviewRight}
              onClick={nextSlide}
              aria-label="Next testimonial"
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                
            
 
              "
            />
               
          </div>
        </div>

        {/* ====================================================
            TESTIMONIAL AREA
        ===================================================== */}

        <div
          className="
            relative
            mt-12
            w-full

            sm:mt-14

            lg:mt-16
          "
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* ==================================================
              DESKTOP CAROUSEL
          =================================================== */}

          <div
            className="
              relative
              hidden
              h-[390px]
              w-full
              items-center
              justify-center

              md:flex
            "
          >
            {testimonials.map((item, index) => {
              const position = getCardPosition(index);

              /*
               * Only show cards around active card.
               */

              if (Math.abs(position) > 1) {
                return null;
              }

              return (
                <article
                  key={item.id}
                  className="
                    absolute
                    w-[280px]
                    rounded-[20px]
                    bg-white
                    p-5
                    shadow-[0_8px_30px_rgba(0,0,0,0.08)]
                    transition-all
                    duration-500
                    ease-out

                    lg:w-[290px]

                    xl:w-[300px]
                  "
                  style={{
                    transform: `
                      translateX(${position * 340}px)
                      scale(${position === 0 ? 1.05 : 0.95})
                    `,
                    zIndex: position === 0 ? 20 : 10,
                    opacity:
                      Math.abs(position) > 1 ? 0 : 1,
                  }}
                >
                  {/* =================================================
                      CUSTOMER
                  ================================================== */}

                  <div className="flex items-center gap-3">
                    {/* Customer image */}

                    <div
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#079447] bg-emerald-50 text-xs font-bold text-[#079447]"
                    >
                      {initials(item.name)}
                    </div>

                    <div className="min-w-0">
                      <h3
                        className="
                          truncate
                          text-[16px]
                          font-bold
                          text-[#444]
                        "
                      >
                        {item.name}
                      </h3>

                      {/* Stars */}

                      <div
                        className="
                          mt-1
                          flex
                          gap-[2px]
                          text-[19px]
                          leading-none
                          text-[#FFB800]
                        "
                      >
                        {Array.from({
                          length: item.rating,
                        }).map((_, starIndex) => (
                          <span key={starIndex}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* =================================================
                      REVIEW
                  ================================================== */}

                  <p
                    className="
                      mt-7
                      min-h-[145px]
                      text-[15px]
                      leading-[1.5]
                      text-[#444]
                    "
                  >
                    "{item.review}"
                  </p>

                  {/* =================================================
                      TIME
                  ================================================== */}

                  <p
                    className="
                      mt-4
                      text-[15px]
                      italic
                      text-gray-400
                    "
                  >
                    {item.time}
                  </p>

                  {/* =================================================
                      SMALL LEAF
                  ================================================== */}

                  <img
                    src={cardleaf}
                    alt=""
                    aria-hidden="true"
                    className="
                      absolute
                      bottom-[-2px]
                      right-[-3px]
                      w-[38px]
                    "
                  />
                </article>
              );
            })}
          </div>

          {/* ==================================================
              MOBILE CAROUSEL
          =================================================== */}

          <div className="md:hidden">
            <div
              className="
                relative
                overflow-hidden
              "
            >
              <div
                className="
                  flex
                  transition-transform
                  duration-500
                  ease-out
                "
                style={{
                  transform: `translateX(-${
                    currentIndex * 100
                  }%)`,
                }}
              >
                {testimonials.map((item) => (
                  <div
                    key={item.id}
                    className="
                      w-full
                      shrink-0
                      px-1
                    "
                  >
                    <article
                      className="
                        relative
                        min-h-[350px]
                        w-full
                        rounded-[20px]
                        bg-white
                        p-5
                        shadow-[0_8px_30px_rgba(0,0,0,0.08)]

                        sm:min-h-[360px]
                        sm:p-6
                      "
                    >
                      {/* ==========================================
                          CUSTOMER
                      =========================================== */}

                      <div className="flex items-center gap-3">
                        <div
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#079447] bg-emerald-50 text-sm font-bold text-[#079447]"
                        >
                          {initials(item.name)}
                        </div>

                        <div className="min-w-0">
                          <h3
                            className="
                              truncate
                              text-[16px]
                              font-bold
                              text-[#444]

                              sm:text-[17px]
                            "
                          >
                            {item.name}
                          </h3>

                          <div
                            className="
                              mt-1
                              flex
                              gap-[2px]
                              text-[19px]
                              leading-none
                              text-[#FFB800]
                            "
                          >
                            {Array.from({
                              length: item.rating,
                            }).map(
                              (_, starIndex) => (
                                <span key={starIndex}>
                                  ★
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ==========================================
                          REVIEW
                      =========================================== */}

                      <p
                        className="
                          mt-7
                          text-[15px]
                          leading-[1.55]
                          text-[#444]

                          sm:text-[16px]
                        "
                      >
                        "{item.review}"
                      </p>

                      {/* ==========================================
                          TIME
                      =========================================== */}

                      <p
                        className="
                          mt-6
                          text-[14px]
                          italic
                          text-gray-400
                        "
                      >
                        {item.time}
                      </p>

                      {/* ==========================================
                          LEAF
                      =========================================== */}

                      <img
                        src={cardleaf}
                        alt=""
                        aria-hidden="true"
                        className="
                          absolute
                          bottom-[-2px]
                          right-[-2px]
                          w-[40px]
                        "
                      />
                    </article>
                  </div>
                ))}
              </div>
            </div>

            {/* ====================================================
                MOBILE CONTROLS
            ===================================================== */}

            <div
              className="
                mt-7
                flex
                items-center
                justify-center
                gap-4
              "
            >
              {/* Previous */}
<img
              src={reviewLeft}
              onClick={previousSlide}
              aria-label="Previous testimonial"
              className="
                flex
                h-10
                w-10
                items-center
                justify-center"
            />
               

              {/* Dots */}

              <div className="flex items-center gap-2">
                {testimonials.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setCurrentIndex(index)
                    }
                    aria-label={`Go to testimonial ${
                      index + 1
                    }`}
                    className={`
                      h-2
                      rounded-full
                      transition-all
                      duration-300

                      ${
                        index === currentIndex
                          ? "w-6 bg-[#079447]"
                          : "w-2 bg-gray-300"
                      }
                    `}
                  />
                ))}
              </div>

              {/* Next */}

              <img
              src={reviewRight}
              onClick={nextSlide}
              aria-label="Next testimonial"
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                
            
 
              "
            />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          BOTTOM DECORATIVE FADE
      ======================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          right-0
          h-16
          bg-gradient-to-t
          from-white
          to-transparent
          opacity-70
        "
      />
    </section>
  );
};

export default Testimonials;
