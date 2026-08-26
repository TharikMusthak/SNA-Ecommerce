import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import defaultBannerImage from "../../assets/images/bannerImage1.png";
import { useBanners } from "@hooks/useBanners";
import { assetUrl } from "@utils/helpers";

const AUTOPLAY_DURATION = 5000;

const defaultHeroSlides = [
  {
    id: 1,
    image: defaultBannerImage,
    mobileImage: defaultBannerImage,
    eyebrow: "",
    title: (
      <>
        <strong>Pure Goodness,</strong> Crafted the
        <br className="hidden sm:block" />
        Traditional Way
      </>
    ),
    description:
      "Bring home the authentic taste of homemade organic foods made with carefully selected ingredients and time-honored recipes.",
    productUrl: "/products/product-3",
    productButton: "View Product",
    whatsappText: "Order on Whatsapp",
    whatsappUrl:
      "https://wa.me/918438660669?text=Hi%20SNA%20Sundaram%2C%20I%20would%20like%20to%20order%20Garlic%20with%20Honey.",
  },
  {
    id: 2,
    image: defaultBannerImage,
    mobileImage: defaultBannerImage,
    eyebrow: "",
    title: (
      <>
        <strong>Traditional Taste,</strong> Made
        <br className="hidden sm:block" />
        With Pure Ingredients
      </>
    ),
    description:
      "Enjoy the rich traditional taste of homemade black sesame laddu prepared with carefully selected ingredients.",
    productUrl: "/products/product-3",
    productButton: "View Product",
    whatsappText: "Order on Whatsapp",
    whatsappUrl:
      "https://wa.me/918438660669?text=Hi%20SNA%20Sundaram%2C%20I%20would%20like%20to%20order%20Black%20Sesame%20Laddu.",
  },
  {
    id: 3,
    image: defaultBannerImage,
    mobileImage: defaultBannerImage,
    eyebrow: "",
    title: (
      <>
        <strong>Homemade Goodness,</strong>
        <br className="hidden sm:block" />
        Just Like Tradition
      </>
    ),
    description:
      "Wholesome homemade treats prepared with traditional recipes and quality ingredients for your family.",
    productUrl: "/products/product-3",
    productButton: "View Product",
    whatsappText: "Order on Whatsapp",
    whatsappUrl:
      "https://wa.me/918438660669?text=Hi%20SNA%20Sundaram%2C%20I%20would%20like%20to%20order%20Karuppu%20Ulundhu%20Laddu.",
  },
];

const HeroCarousel = () => {
  const { data: bannersData } = useBanners();


  console.log("bannersData",bannersData);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  const heroSlides = useMemo(() => {
    if (!bannersData || !Array.isArray(bannersData) || bannersData.length === 0) {
      return defaultHeroSlides;
    }

    return bannersData.map((banner, index) => {
      const bannerImg = assetUrl(
        banner.image ||
          banner.image_url ||
          banner.banner_image ||
          banner.desktop_image ||
          banner.url,
        defaultBannerImage,
      );

      const mobileImg = assetUrl(
        banner.mobile_image ||
          banner.mobile_image_url ||
          banner.mobile_banner ||
          banner.image ||
          banner.image_url ||
          banner.url,
        bannerImg,
      );

      const productUrl =
        banner.product_url ||
        banner.button_link ||
        banner.link ||
        (banner.product_id
          ? `/products/${banner.product_slug || banner.product_id}`
          : "/products");

      const whatsappText =
        banner.whatsapp_button || banner.whatsapp_text || "Order on Whatsapp";
      const whatsappUrl =
        banner.whatsapp_url ||
        `https://wa.me/918438660669?text=${encodeURIComponent(
          `Hi SNA Sundaram, I would like to order ${banner.title || "from your store"}.`,
        )}`;

      return {
        id: banner.id || `api-banner-${index}`,
        image: bannerImg,
        mobileImage: mobileImg,
        eyebrow: banner.eyebrow || "",
        title: banner.title ? (
          <span dangerouslySetInnerHTML={{ __html: banner.title }} />
        ) : (
          defaultHeroSlides[index % defaultHeroSlides.length].title
        ),
        description:
          banner.description ||
          banner.subtitle ||
          defaultHeroSlides[index % defaultHeroSlides.length].description,
        productUrl,
        productButton:
          banner.button_text || banner.product_button || "View Product",
        whatsappText,
        whatsappUrl,
      };
    });
  }, [bannersData]);

  const totalSlides = heroSlides.length;

  useEffect(() => {
    if (currentSlide >= totalSlides) {
      setCurrentSlide(0);
    }
  }, [totalSlides, currentSlide]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const previousSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const diff = touchCurrentX.current - touchStartX.current;
    const swipeThreshold = 50;
    if (Math.abs(diff) > swipeThreshold) {
      if (diff < 0) {
        nextSlide();
      } else {
        previousSlide();
      }
    }
    setIsDragging(false);
    setDragOffset(0);
  };

  useEffect(() => {
    if (isPaused || totalSlides <= 1) {
      return;
    }
    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_DURATION);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, totalSlides]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        previousSlide();
      }
      if (event.key === "ArrowRight") {
        nextSlide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [nextSlide, previousSlide]);

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-label="Featured products"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="relative aspect-[2/1] w-full overflow-hidden touch-pan-y select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {heroSlides.map((item, index) => (
          <div
            key={item.id}
            className={`
              absolute
              inset-0
              ${
                isDragging
                  ? "transition-none"
                  : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              }
            `}
            style={{
              transform: `translateX(calc(${(index - currentSlide) * 100}% + ${dragOffset}px))`,
            }}
            aria-hidden={index !== currentSlide}
          >
            {/* Background Image with Responsive Mobile Picture Source */}
            <picture className="absolute inset-0 h-full w-full">
              <source
                media="(max-width: 640px)"
                srcSet={item.mobileImage || item.image}
              />
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-cover"
              />
            </picture>

            {/* Content overlay */}
            <div className="absolute inset-0 z-20">
              <div className="relative mx-auto h-full w-full max-w-[1500px]">
                <div
                  className="
                    absolute
                    left-[5%]
                    top-1/3
                    w-[43%]
                    max-w-[600px]
                    -translate-y-1/2
                    text-white
                    max-[1024px]:left-[6%]
                    max-[1024px]:w-[44%]
                    max-[767px]:left-[5%]
                    max-[767px]:w-[46%]
                    max-[480px]:left-[4%]
                    max-[480px]:w-[48%]
                  "
                >
                  {/* TITLE */}
                  <h1
                    className="
                      text-[clamp(20px,3vw,50px)]
                      font-normal
                      leading-[1.15]
                      tracking-[-0.02em]
                      max-[1024px]:text-[clamp(17px,3vw,36px)]
                      max-[767px]:text-[clamp(13px,3.4vw,24px)]
                      max-[767px]:leading-[1.18]
                      max-[480px]:text-[clamp(11px,3.5vw,18px)]
                    "
                  >
                    {item.title}
                  </h1>

                  {/* DESCRIPTION */}
                  <p
                    className="
                      mt-[clamp(8px,1vw,18px)]
                      max-w-[550px]
                      text-[clamp(10px,1.05vw,17px)]
                      leading-[1.5]
                      text-white/95
                      max-[1024px]:text-[clamp(9px,1.1vw,14px)]
                      max-[767px]:mt-[6px]
                      max-[767px]:text-[clamp(8px,1.8vw,12px)]
                      max-[767px]:leading-[1.35]
                      max-[480px]:mt-[4px]
                      max-[480px]:text-[clamp(7px,1.9vw,10px)]
                    "
                  >
                    {item.description}
                  </p>

                  {/* BUTTONS */}
                  <div
                    className="
                      mt-[clamp(12px,1.5vw,24px)]
                      flex
                      items-center
                      gap-[clamp(7px,1vw,16px)]
                      max-[767px]:mt-[7px]
                      max-[767px]:gap-[6px]
                      max-[480px]:mt-[5px]
                      max-[480px]:gap-[4px]
                    "
                  >
                    {/* VIEW PRODUCT */}
                    <Link
                      to={item.productUrl}
                      className="
                        inline-flex
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white
                        px-[clamp(14px,1.8vw,30px)]
                        py-[clamp(6px,0.55vw,10px)]
                        text-[clamp(9px,0.85vw,14px)]
                        font-medium
                        whitespace-nowrap
                        transition-all
                        duration-300
                        hover:bg-white
                        hover:text-[#222]
                        max-[767px]:px-3
                        max-[767px]:py-1
                        max-[767px]:text-[8px]
                        max-[480px]:px-2
                        max-[480px]:py-[3px]
                        max-[480px]:text-[7px]
                      "
                    >
                      {item.productButton}
                    </Link>

                    {/* WHATSAPP */}
                    <a
                      href={item.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex
                        items-center
                        justify-center
                        rounded-full
                        bg-white
                        px-[clamp(14px,1.8vw,30px)]
                        py-[clamp(6px,0.55vw,10px)]
                        text-[clamp(9px,0.85vw,14px)]
                        font-medium
                        whitespace-nowrap
                        text-[#444]
                        transition-all
                        duration-300
                        hover:bg-[#079447]
                        hover:text-white
                        max-[767px]:px-3
                        max-[767px]:py-1
                        max-[767px]:text-[8px]
                        max-[480px]:px-2
                        max-[480px]:py-[3px]
                        max-[480px]:text-[7px]
                      "
                    >
                      {item.whatsappText}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous slide"
              className="absolute left-5 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white backdrop-blur-sm transition hover:bg-white hover:text-[#222222] lg:flex"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="absolute right-5 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white backdrop-blur-sm transition hover:bg-white hover:text-[#222222] lg:flex"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default HeroCarousel;