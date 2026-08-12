import { useMemo, useState } from "react";
import {
  Heart,
  Minus,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import Tinyleaf from "@assets/images/tinyleaf.svg";
import ProductCard from "@components/products/ProductCard";
import {
  useProduct,
  useProducts,
  useRelatedProducts,
} from "@hooks/useProducts";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import product1 from "@assets/images/product1.png";
import product2 from "@assets/images/product2.png";
import Spinner from "@components/ui/Spinner/Spinner";


const featuredProducts = [
  {
    id: 1,
    name: "Black Sesame Laddu",
    brand: "SNA Sundaram",
    price: 50,
    image: product1,
    isFavorite: true,
  },
  {
    id: 2,
    name: "Black Sesame Laddu",
    brand: "SNA Sundaram",
    price: 50,
    image: product2,
    isFavorite: false,
  },
  {
    id: 3,
    name: "Black Sesame Laddu",
    brand: "SNA Sundaram",
    price: 50,
    image: product1,
    isFavorite: false,
  },
  {
    id: 4,
    name: "Black Sesame Laddu",
    brand: "SNA Sundaram",
    price: 50,
    image: product2,
    isFavorite: false,
  },
];


/* ==========================================================
   PRODUCT CARD
========================================================== */

const ProductCard1 = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const [favorite, setFavorite] = useState(product.isFavorite);

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const toggleFavorite = () => {
    setFavorite((prev) => !prev);
  };

  return (
    
<article
  className="
    group
    w-full
    overflow-hidden
    rounded-[18px]
    bg-white
    rounded-t-[500px]
   p-[5px]
    sm:p-0
    transition-all
    duration-300
    hover:-translate-y-1
    hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)]
  "
>
  {/* =====================================================
      PRODUCT IMAGE
  ====================================================== */}

  <div
    className="
      relative
      w-full
      overflow-hidden
      p-0
      sm:p-[10px]
    "
  >
    <img
      src={product.image}
      alt={product.name}
      className="
        block
        w-full
        rounded-t-[500px]
        object-cover
        transition-transform
        duration-500
        
        group-hover:scale-[1.03]
      "
    />
  </div>

  {/* =====================================================
      PRODUCT DETAILS
  ====================================================== */}

  <div
    className="
      px-3.5
      pb-3
      pt-3
      sm:px-4
      sm:pb-4
    "
  >
    {/* NAME + WISHLIST */}

    <div className="flex items-start justify-between gap-2">
      <h3
        className="
          mt-7
          max-w-[1050px]
          text-[clamp(15px,1.35vw,22px)]
          leading-[1.45]
          text-[#414141]
        "
      >
        {product.name}
      </h3>

      <button
        type="button"
        onClick={toggleFavorite}
        aria-label={
          favorite
            ? "Remove from wishlist"
            : "Add to wishlist"
        }
        className="
          shrink-0
          transition-transform
          duration-200
          hover:scale-110
        "
      >
        <Heart
          size={17}
          strokeWidth={1.5}
          className={
            favorite
              ? "fill-[#C92828] text-[#C92828]"
              : "text-[#444444]"
          }
        />
      </button>
    </div>

    {/* BRAND */}

    <p
      className="
        mt-1
        text-[12px]
        leading-none
        text-[#666666]
        sm:text-[11px]
      "
    >
      {product.brand}
    </p>

    {/* PRICE + QUANTITY */}

    <div
      className="
        mt-2
        flex
        items-center
        justify-between
      "
    >
      {/* PRICE */}

      <span
        className="
          text-[13px]
          font-semibold
          text-[#079447]
          sm:text-[14px]
        "
      >
        Rs:{product.price}
      </span>

      {/* QUANTITY */}

      <div
        className="
          flex
          items-center
          gap-2
          text-[10px]
          text-[#444444]
          sm:gap-2.5
          sm:text-[11px]
        "
      >
        <button
          type="button"
          onClick={decreaseQuantity}
          aria-label="Decrease quantity"
          className="
            transition
            hover:text-[#079447]
          "
        >
          -
        </button>

        <span className="min-w-[15px] text-center text-[#079447]">
          {String(quantity).padStart(2, "0")}
        </span>

        <button
          type="button"
          onClick={increaseQuantity}
          aria-label="Increase quantity"
          className="
            transition
            hover:text-[#079447]
          "
        >
          +
        </button>
      </div>
    </div>

    {/* ADD TO CART */}

    <button
      type="button"
      className="
        mx-auto
        mt-2.5
        flex
        h-[60px]
        w-[70%]
        items-center
        justify-center
        rounded-full
        bg-[#079447]
        px-3
        text-[14px]
        font-medium
        text-white
        transition-all
        duration-300

        hover:bg-[#057a3a]
        hover:shadow-md

        sm:mt-3
        sm:h-[30px]
        sm:text-[14px]
      "
    >
      Add to Cart
    </button>
  </div>
</article>
 

  );
};

const CurvedLine = () => {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2  ">
      <svg class="top-curve" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path
            d="M0 0
               C350 100, 1090 100, 1440 0
               L1440 0
               L0 0
               Z"
            fill="white"
        />
    </svg>
    </div>
  );
};

/* ==========================================================
  FEATURED PRODUCTS SECTION
========================================================== */

const FeaturedProducts = () => {
const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(
    () => ({
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || "newest",
      page: Number(searchParams.get("page") || 1),
      limit: 12,
      available: "true",
    }),
    [searchParams],
  );
    const { data, isLoading, isError } = useProducts(params);

  return (

    <>
      <section
        className="
        relative
        w-full
        m-b-200
                overflow-hidden
bg-[linear-gradient(180deg,#F6F6F6_0%,#FAFAFA_100%)]
        md:rounded-[0]
        xl:rounded-[0_0_117%_130%/_0_0_500px_500px]
      "
      >

        {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

        <div
          className="
          relative
          z-10
          mx-auto
          w-full
          max-w-[1500px]
          px-5
          pb-24
          pt-12

          sm:px-8
          sm:pb-28
          sm:pt-14

          md:px-10
          md:pt-16

          lg:px-14
          lg:pb-32
          lg:pt-16

          xl:px-20
        "
        >

          {/* ===================================================
            SECTION HEADING
        ==================================================== */}

          <div className="mx-auto max-w-[700px] items-center text-center">

            <div className="flex items-center justify-center gap-2">

              <h2
                className="
             text-[clamp(43px,3.3vw,56px)]
              font-regular
              leading-[1.12]
              tracking-[-0.025em]
              text-[#3f3f3f]
              flex
                 
            "
              >
                Featured Products

              </h2><img
                className="h-auto w-[24px] "
                alt="Tiny leaf"
                aria-hidden="true"
                src={Tinyleaf}
              />


            </div>


            <p
              className="
              mx-auto
              mt-3
              max-w-[600px]
            text-[clamp(18px,1.0vw,16px)]
              leading-[1.45]
              text-[#4a4a4a]
            "
            >
              We believe healthy food begins with honest ingredients and
              traditional preparation methods.
            </p>

          </div>


          {/* ===================================================
            PRODUCT GRID
        ==================================================== */}

      { isLoading && (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            )}

 <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
 


        {data?.items?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
          {/* ===================================================
            VIEW MORE
        ==================================================== */}

          <div className="mt-8 flex justify-center sm:mt-10">

            <Link
              to="/products"
              className="
              inline-flex
              min-w-[100px]
              items-center
              justify-center
              rounded-full
              border
              border-[#333333]
              px-6
              py-1.5
              text-[10px]
              font-normal
              text-[#333333]
              transition-all
              duration-300

              hover:border-[#079447]
              hover:bg-[#079447]
              hover:text-white

              sm:min-w-[110px]
              sm:px-7
              sm:py-2
              sm:text-[11px]
            "
            >
              View More
            </Link>

          </div>
          {/* <CurvedLine /> */}
        </div>


        {/* =====================================================
          CURVED BOTTOM
      ====================================================== */}


      </section>

    </>




  );
};

export default FeaturedProducts;