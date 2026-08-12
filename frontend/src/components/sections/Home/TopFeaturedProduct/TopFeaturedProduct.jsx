import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ProductImage from "@assets/images/garlic-honey-product.png";
import HomeMadeBadge from "@assets/images/home-made-badge.png";
import Tinyleaf from "@assets/images/tinyleaf.svg";
import {
  useProduct,
  useProducts,
  useRelatedProducts,
} from "@hooks/useProducts";
const product = {
  id: 1,

  category: "Featured Product",

  title: "Garlic with Honey",

  subtitle: "Nature's Perfect Wellness Blend",

  sizes: [
    {
      label: "250 G",
      value: "250g",
      price: 50,
    },
    {
      label: "500 G",
      value: "500g",
      price: 90,
    },
  ],

  description:
    "Known for its nutritional value and rich flavor, it can be enjoyed daily as part of a balanced lifestyle.",

  productUrl: ProductImage,
};

const TopFeaturedProduct = () => {
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);

  // ============================================================
  // SIZE CHANGE
  // ============================================================

  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

  // ============================================================
  // ADD TO CART
  // ============================================================

  const handleAddToCart = () => {
    const existingCart = JSON.parse(
      localStorage.getItem("cart") || "[]"
    );

    const existingItemIndex = existingCart.findIndex(
      (item) =>
        item.productId === product.id &&
        item.size === selectedSize.value
    );

    if (existingItemIndex !== -1) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push({
        productId: product.id,
        title: product.title,
        size: selectedSize.value,
        sizeLabel: selectedSize.label,
        price: selectedSize.price,
        image: product.productUrl,
        quantity: 1,
      });
    }

    localStorage.setItem(
      "cart",
      JSON.stringify(existingCart)
    );

    alert(
      `${product.title} - ${selectedSize.label} added to cart`
    );
  };

  // ============================================================
  // BUY NOW
  // ============================================================

  const handleBuyNow = () => {
    const buyNowProduct = {
      productId: product.id,
      title: product.title,
      size: selectedSize.value,
      sizeLabel: selectedSize.label,
      price: selectedSize.price,
      image: product.productUrl,
      quantity: 1,
    };

    localStorage.setItem(
      "buyNowProduct",
      JSON.stringify(buyNowProduct)
    );

    navigate("/cart");
  };

  return (
    <section className="w-full overflow-hidden bg-white">
      <div
        className="
          mx-auto
          grid
          w-full
          max-w-[1800px]
          grid-cols-1
          px-5
          py-10

          sm:px-8
          sm:py-12

          lg:grid-cols-[1fr_1.4fr_1fr]
          lg:items-center
          lg:px-12
          lg:py-16
        "
      >
        {/* =====================================================
            MOBILE/TOP + DESKTOP LEFT CONTENT
        ====================================================== */}

        <div className="contents lg:block">

          {/* =====================================================
              TITLE
          ====================================================== */}

          <div className="order-1 lg:order-none">
            <div className="mb-2 flex items-center gap-1">
              <span
                className="
                  text-[clamp(20px,1.8vw,27px)]
                  font-bold
                  leading-none
                  text-[#3d3d3d]
                "
              >
                Featured Product
              </span>

              <img
                src={Tinyleaf}
                alt="Tiny leaf"
                aria-hidden="true"
                className="h-auto w-[17px]"
              />
            </div>

            <h2
              className="
                mt-2
                text-3xl
                font-normal
                leading-tight
                text-[#3f3f3f]

                sm:text-4xl

                lg:text-5xl
              "
            >
              {product.title}
            </h2>

            <p
              className="
                mt-2
                text-lg
                text-[#444]

                sm:text-xl

                lg:text-2xl
              "
            >
              {product.subtitle}
            </p>
          </div>

          {/* =====================================================
              MOBILE BADGE
          ====================================================== */}

          <div
            className="
              order-2
               flex
              justify-end

              lg:hidden
            "
          >
            <img
              src={HomeMadeBadge}
              alt="Home Made"
              className="
                h-28
                w-28
                object-contain

                sm:h-32
                sm:w-32
              "
            />
          </div>

          {/* =====================================================
              MOBILE PRODUCT IMAGE
          ====================================================== */}

          <div
            className="
              order-3
              relative
             
              flex
              min-h-[280px]
              items-end
              justify-center

              sm:min-h-[340px]

              lg:hidden
            "
          >
            <img
              src={ProductImage}
              alt={product.title}
              className="
                relative
                z-10
                h-auto
                w-[100%]
                max-w-[380px]
                object-contain

                sm:w-[65%]
              "
            />
          </div>

          {/* =====================================================
              SIZE + PRICE + ACTIONS
          ====================================================== */}

          <div
            className="
              order-4
              mt-8

              lg:order-none
              lg:mt-8
            "
          >

            {/* =================================================
                SIZE
            ================================================== */}

            <h3 className="text-xl font-bold text-[#3f3f3f]">
              Size:
            </h3>

            <div className="mt-4 flex flex-wrap gap-3">
              {product.sizes.map((size) => {
                const isSelected =
                  selectedSize.value === size.value;

                return (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => handleSizeChange(size)}
                    className={`
                      rounded-lg
                      border
                      px-7
                      py-2
                      font-medium
                      transition-all
                      duration-200

                      ${
                        isSelected
                          ? "border-[#079447] bg-[#079447] text-white"
                          : "border-[#333] bg-white text-[#444] hover:border-[#079447] hover:text-[#079447]"
                      }
                    `}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>

            {/* =================================================
                PRICE
            ================================================== */}

            <h3 className="mt-8 text-xl font-bold text-[#3f3f3f]">
              Price:
            </h3>

            <p className="mt-2 text-3xl font-medium text-[#079447]">
              Rs: {selectedSize.price}
            </p>

            {/* =================================================
                ACTION BUTTONS
            ================================================== */}

            <div
              className="
                mt-8
                flex
                flex-wrap
                gap-4
              "
            >
              {/* ADD TO CART */}

              <button
                type="button"
                onClick={handleAddToCart}
                className="
                  rounded-lg
                  border
                  border-[#333]
                  px-8
                  py-3
                  font-medium
                  text-[#444]
                  transition-all
                  duration-200

                  hover:border-[#079447]
                  hover:bg-[#079447]
                  hover:text-white
                "
              >
                Add to Cart
              </button>

              {/* BUY NOW */}

              <button
                type="button"
                onClick={handleBuyNow}
                className="
                  rounded-lg
                  bg-[#079447]
                  px-8
                  py-3
                  font-medium
                  text-white
                  transition-all
                  duration-200

                  hover:bg-[#057a3a]
                "
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            DESKTOP CENTER IMAGE
        ====================================================== */}

        <div
          className="
            relative
            hidden
            min-h-[600px]
            items-end
            justify-center

            lg:flex
          "
        >
          <img
            src={ProductImage}
            alt={product.title}
            className="
              relative
              z-10
              h-auto
              w-full
              max-w-[650px]
              object-contain
            "
          />
        </div>

        {/* =====================================================
            DESKTOP BADGE + RIGHT CONTENT
        ====================================================== */}

        <div className="hidden lg:block">

          {/* =================================================
              HOME MADE BADGE
          ================================================== */}

          <div className="flex justify-end">
            <img
              src={HomeMadeBadge}
              alt="Home Made"
              className="
                h-36
                w-36
                object-contain
              "
            />
          </div>

          {/* =================================================
              WHY YOU'LL LOVE IT
          ================================================== */}

          <div className="mt-8">

            <h3
              className="
                text-3xl
                font-bold
                text-[#3f3f3f]
              "
            >
              Why You'll Love It
            </h3>

            <p
              className="
                mt-5
                max-w-[400px]
                text-xl
                leading-[1.5]
                text-[#444]
              "
            >
              {product.description}
            </p>

            {/* VIEW DETAILS */}

            <Link
              to={`/product/${product.id}`}
              className="
                mt-8
                inline-flex
                rounded-lg
                border
                border-[#333]
                px-8
                py-3
                font-medium
                text-[#444]
                transition-all
                duration-200

                hover:border-[#079447]
                hover:bg-[#079447]
                hover:text-white
              "
            >
              View Details
            </Link>

          </div>
        </div>

        {/* =====================================================
            MOBILE WHY YOU'LL LOVE IT
        ====================================================== */}

        <div
          className="
            order-6
            mt-12

            lg:hidden
          "
        >

          <h3
            className="
              text-2xl
              font-bold
              text-[#3f3f3f]

              sm:text-3xl
            "
          >
            Why You'll Love It
          </h3>

          <p
            className="
              mt-4
              max-w-xl
              text-base
              leading-7
              text-[#444]

              sm:text-lg
            "
          >
            {product.description}
          </p>

          {/* VIEW DETAILS */}

          <Link
            to={`/product/${product.id}`}
            className="
              mt-6
              inline-flex
              rounded-lg
              border
              border-[#333]
              px-7
              py-2.5
              text-sm
              font-medium
              text-[#444]
              transition-all
              duration-200

              hover:border-[#079447]
              hover:bg-[#079447]
              hover:text-white
            "
          >
            View Details
          </Link>

        </div>
      </div>
    </section>
  );
};

export default TopFeaturedProduct;