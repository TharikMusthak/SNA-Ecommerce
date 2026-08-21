import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import HomeMadeBadge from "@assets/images/home-made-badge.png";
import Tinyleaf from "@assets/images/tinyleaf.svg";
import fallbackImage from "@assets/images/product1.png";
import Spinner from "@components/ui/Spinner/Spinner";
import { apiErrorMessage } from "@api/axios";
import { useAuth } from "@context/AuthProvider";
import { useCart } from "@hooks/useCart";
import { useFeaturedProducts } from "@hooks/useProducts";
import ProductPrice from "@components/products/ProductPrice";
import { assetUrl } from "@utils/helpers";
import toast from "react-hot-toast";

const sizePricing = (source = {}, product = {}) => {
  const safeSource = source || {};
  const safeProduct = product || {};

  return {
    price: safeSource.price ?? safeProduct.price ?? null,
    sale_price: safeSource.sale_price ?? safeProduct.sale_price ?? null,
    effective_price:
      safeSource.effective_price ?? safeProduct.effective_price ?? null,
  };
};

const normalizeSizes = (product) => {
  if (Array.isArray(product?.sizes) && product.sizes.length) {
    return product.sizes.map((size, index) => ({
      label: size.label || size.name || size.size || `Option ${index + 1}`,
      value: size.value || size.id || size.slug || size.label || `option-${index + 1}`,
      ...sizePricing(size, product),
    }));
  }

  if (Array.isArray(product?.variants) && product.variants.length) {
    return product.variants.map((variant, index) => ({
      label:
        variant.label ||
        variant.name ||
        variant.size ||
        variant.pack_size ||
        `Option ${index + 1}`,
      value:
        variant.value ||
        variant.id ||
        variant.slug ||
        variant.size ||
        `option-${index + 1}`,
      ...sizePricing(variant, product),
    }));
  }

  const fallbackLabel =
    product?.pack_size ||
    product?.size ||
    product?.weight ||
    "Default";

  return [
    {
      label: String(fallbackLabel),
      value: String(product?.slug || product?.id || "default"),
      ...sizePricing(product, product),
    },
  ];
};

const TopFeaturedProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { data, isLoading, isError } = useFeaturedProducts({ limit: 1 });

  const product = data?.items?.[0] || null;

  const [selectedSize, setSelectedSize] = useState(null);

  const sizes = useMemo(() => normalizeSizes(product), [product]);

  const activeSize = selectedSize || sizes[0] || null;
  const pricingProduct = selectedSize && activeSize
    ? sizePricing(activeSize, product)
    : product || {};

  const productImage = assetUrl(
    product?.future_image ||
      product?.image ||
      product?.thumbnail ||
      product?.future_image,
    fallbackImage,
  );

  const handleSizeChange = (size) => {
    setSelectedSize(size);
  };

  const requireLogin = () => {
    if (isAuthenticated) return true;
    navigate("/auth/login", {
      state: { from: location.pathname + location.search },
    });
    return false;
  };

const addToCart = async () => {
    if (!requireLogin()) return;
    try {
      await addItem.mutateAsync({ productId: product.id, quantity: 1 });
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not add this product"));
    }
  };

const handleAddToCart = async () => {
  const added = await addToCart();

  if (added && product) {
    toast.success(`${product.name} added to cart`);
  }
};

const handleBuyNow = async () => {
  const added = await addToCart();

  
    navigate("/cart");
   
};


  if (isLoading) {
    return (
      <section className="w-full overflow-hidden bg-white">
        <div className="mx-auto grid w-full max-w-[1800px] place-items-center px-5 py-16 sm:px-8 lg:px-12">
          <Spinner />
        </div>
      </section>
    );
  }

  if (isError || !product) {
    return (
      <section className="w-full overflow-hidden bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-5 py-12 text-center sm:px-8 lg:px-12 lg:py-16">
          <h2 className="text-3xl font-semibold text-[#3f3f3f]">
            Featured product is not available right now.
          </h2>
          <p className="mt-3 text-sm text-gray-500">
            Please check back soon for our highlighted product.
          </p>
        </div>
      </section>
    );
  }

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
        <div className="contents lg:block">
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
                {product.category_name || "Featured Product"}
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
              {product.name}
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
              {product.short_description || product.subtitle || "Nature's Perfect Wellness Blend"}
            </p>
          </div>

          <div className="order-2 flex justify-end lg:hidden">
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
              src={productImage}
              alt={product.name}
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

          <div
            className="
              order-4
              mt-8

              lg:order-none
              lg:mt-8
            "
          >
            <h3 className="text-xl font-bold text-[#3f3f3f]">
              Size:
            </h3>

            <div className="mt-4 flex flex-wrap gap-3">
              {sizes.map((size) => {
                const isSelected = activeSize?.value === size.value;

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

            <h3 className="mt-8 text-xl font-bold text-[#3f3f3f]">
              Price:
            </h3>

            <p className="mt-2 text-3xl font-medium text-[#079447]">
              <ProductPrice
                product={pricingProduct}
                currentClassName="text-3xl font-medium text-[#079447]"
                originalClassName="ml-2 text-lg font-normal text-gray-400"
              />
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addItem.isPending}
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

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={addItem.isPending}
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
            src={productImage}
            alt={product.name}
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

        <div className="hidden lg:block">
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

          <div className="mt-8">
            <h3 className="text-3xl font-bold text-[#3f3f3f]">
              Why You'll Love It
            </h3>

            <p className="mt-5 max-w-[400px] text-xl leading-[1.5] text-[#444]">
              {product.description || "Made with carefully selected ingredients."}
            </p>

            <Link
              to={`/products/${product.slug || product.id}`}
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

        <div
          className="
            order-6
            mt-12

            lg:hidden
          "
        >
          <h3 className="text-2xl font-bold text-[#3f3f3f] sm:text-3xl">
            Why You'll Love It
          </h3>

          <p className="mt-4 max-w-xl text-base leading-7 text-[#444] sm:text-lg">
            {product.description || "Made with carefully selected ingredients."}
          </p>

          <Link
            to={`/products/${product.slug || product.id}`}
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
