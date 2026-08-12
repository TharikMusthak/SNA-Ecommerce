import { useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import Tinyleaf from "@assets/images/tinyleaf.svg";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import ProductCard from "@components/products/ProductCard";
import Spinner from "@components/ui/Spinner/Spinner";
import { useAuth } from "@context/AuthProvider";
import { useCart } from "@hooks/useCart";
import {
  useProduct,
  useProducts,
  useRelatedProducts,
} from "@hooks/useProducts";
import { useWishlist } from "@hooks/useWishlist";
import { useProductReviews, useSubmitReview } from "@hooks/useReviews";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl, effectivePrice } from "@utils/helpers";

const Product = () => {
  const { identifier } = useParams();
  return identifier ? (
    <ProductDetail identifier={identifier} />
  ) : (
    <ProductList />
  );
};

const ProductList = () => {
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

  const setSort = (sort) => {
    const next = new URLSearchParams(searchParams);
    next.set("sort", sort);
    next.set("page", "1");
    setSearchParams(next);
  };

  return (
    <section className="mx-auto min-h-[70vh] w-full max-w-[1380px] px-5 py-12 sm:px-8 lg:px-14">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
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
             SNA catalogue
            </span>

            <img
              className="h-auto w-[17px]"
            alt="Tiny leaf"
              aria-hidden="true"
              src={Tinyleaf}
            />
              
          </div>
          <h1 className="mt-2 text-4xl font-semibold text-gray-900">
            {params.q ? `Results for “${params.q}”` : "Our Products"}
          </h1>
          <p className="mt-2 text-gray-500">
            {data?.pagination?.total ?? 0} products available
          </p>
        </div>
        <select
          value={params.sort}
          onChange={(event) => setSort(event.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#079447]"
        >
          <option value="newest">Newest</option>
          <option value="name">Name</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </div>
      {isLoading && (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      )}
      {isError && (
        <p className="py-20 text-center text-red-600">
          Products could not be loaded. Please try again.
        </p>
      )}
      {!isLoading && !isError && !data?.items?.length && (
        <p className="py-20 text-center text-gray-500">
          No products match this search.
        </p>
      )}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.items?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {data?.pagination?.totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-3">
          <button
            disabled={params.page <= 1}
            onClick={() =>
              setSearchParams({
                ...Object.fromEntries(searchParams),
                page: String(params.page - 1),
              })
            }
            className="rounded-lg border px-4 py-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {params.page} of {data.pagination.totalPages}
          </span>
          <button
            disabled={!data.pagination.hasNext}
            onClick={() =>
              setSearchParams({
                ...Object.fromEntries(searchParams),
                page: String(params.page + 1),
              })
            }
            className="rounded-lg border px-4 py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
};

const ProductDetail = ({ identifier }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: product, isLoading, isError } = useProduct(identifier);
  const { data: related } = useRelatedProducts(product?.id);
  const { addItem } = useCart();
  const wishlist = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(product?.id);
  const submitReview = useSubmitReview(product?.id);

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  if (isError || !product)
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="text-3xl font-semibold">Product not found</h1>
        <button
          onClick={() => navigate("/products")}
          className="mt-6 text-[#079447]"
        >
          Back to products
        </button>
      </div>
    );

  const selectedVariant = product.variants?.find(
    (variant) => Number(variant.id) === Number(variantId),
  );
  const price = selectedVariant?.price ?? effectivePrice(product);
  const stock = selectedVariant?.stock ?? product.stock;
  const favorite = wishlist.items.some(
    (item) => Number(item.id) === Number(product.id),
  );
  const reviews = reviewsData?.items || [];
  const reviewCount = Number(
    product.review_count ??
      product.reviews_count ??
      reviewsData?.pagination?.total ??
      reviews.length,
  );
  const fetchedRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) /
      reviews.length
    : 0;
  const productRating = Number(
    product.average_rating ?? product.rating ?? fetchedRating,
  );

  const ensureLogin = () => {
    if (isAuthenticated) return true;
    navigate("/auth/login", { state: { from: location.pathname } });
    return false;
  };

  const add = async () => {
    if (!ensureLogin()) return;
    try {
      await addItem.mutateAsync({ productId: product.id, quantity, variantId });
      toast.success("Added to cart");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not add product"));
    }
  };

  const toggleFavorite = async () => {
    if (!ensureLogin()) return;
    try {
      if (favorite) await wishlist.removeItem.mutateAsync(product.id);
      else await wishlist.addItem.mutateAsync(product.id);
      toast.success(favorite ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not update wishlist"));
    }
  };

  const submitRating = async (event) => {
    event.preventDefault();
    if (!ensureLogin()) return;
    const title = reviewTitle.trim();
    const review_text = reviewText.trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      toast.error("Please choose a rating from 1 to 5 stars");
      return;
    }
    if (!title) {
      toast.error("Please add a review title before submitting");
      return;
    }
    if (!review_text) {
      toast.error("Please write a review before submitting");
      return;
    }

    try {
      await submitReview.mutateAsync({
        product_id: product.id,
        rating,
        title,
        review_text,
      });
      setRating(0);
      setReviewTitle("");
      setReviewText("");
      toast.success("Thanks for reviewing this product");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not submit your rating"));
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1380px] px-5 py-12 sm:px-8 lg:px-14">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="rounded-[2rem] bg-[#f5f7f1] p-8">
          <img
            src={assetUrl(product.main_image, fallbackImage)}
            alt={product.name}
            className="mx-auto aspect-square w-full object-contain"
          />
        </div>
        <div className="py-4">
          <p className="font-semibold uppercase tracking-[0.18em] text-[#079447]">
            {product.category_name || "SNA Sundaram"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-gray-900 sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-gray-500">
            {product.brand_name || product.sku}
          </p>
          <div className="mt-5 flex items-center gap-2">
            <div className="flex items-center gap-0.5" aria-label={`${productRating || 0} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={19} className={star <= Math.round(productRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
              ))}
            </div>
            <span className="font-semibold text-gray-800">{productRating ? productRating.toFixed(1) : "New"}</span>
            <span className="text-sm text-gray-500">{reviewCount ? `(${reviewCount} ratings)` : "Be the first to rate"}</span>
          </div>
          <div className="mt-7 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#079447]">
              {formatCurrency(price)}
            </span>
            {product.sale_price && !selectedVariant && (
              <span className="text-lg text-gray-400 line-through">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
          <p className="mt-6 leading-7 text-gray-600">
            {product.description ||
              product.short_description ||
              "Traditionally prepared with carefully selected ingredients."}
          </p>
          {product.variants?.length > 0 && (
            <div className="mt-7">
              <p className="font-semibold text-gray-800">Choose an option</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setVariantId(variant.id)}
                    className={`rounded-xl border px-4 py-2 text-sm ${Number(variantId) === Number(variant.id) ? "border-[#079447] bg-[#079447] text-white" : "border-gray-300"}`}
                  >
                    {[variant.size, variant.color, variant.brand]
                      .filter(Boolean)
                      .join(" · ") || variant.sku}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p
            className={`mt-6 text-sm font-medium ${Number(stock) > 0 ? "text-[#079447]" : "text-red-600"}`}
          >
            {Number(stock) > 0 ? `${stock} in stock` : "Out of stock"}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <div className="flex items-center rounded-xl border border-gray-300">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="p-3"
                aria-label="Decrease quantity"
              >
                <Minus size={18} />
              </button>
              <span className="min-w-10 text-center font-semibold">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity((value) => Math.min(Number(stock), value + 1))
                }
                className="p-3"
                aria-label="Increase quantity"
              >
                <Plus size={18} />
              </button>
            </div>
            <button
              disabled={
                Number(stock) < 1 ||
                addItem.isPending ||
                (product.variants?.length > 0 && !variantId)
              }
              onClick={add}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#079447] px-7 py-3 font-semibold text-white hover:bg-[#057a3a] disabled:bg-gray-300"
            >
              <ShoppingBag size={19} /> Add to cart
            </button>
            <button
              onClick={toggleFavorite}
              className={`rounded-xl border p-3 ${favorite ? "border-red-200 bg-red-50 text-red-600" : "border-gray-300"}`}
              aria-label="Toggle wishlist"
            >
              <Heart fill={favorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
      <section className="mt-20 grid gap-8 rounded-[2rem] bg-[#f5f7f1] p-6 sm:p-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
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
            Customer feedback
            </span>

            <img
              className="h-auto w-[17px]"
            alt="Tiny leaf"
              aria-hidden="true"
              src={Tinyleaf}
            />
              
          </div>
           <h2 className="mt-2 text-3xl font-semibold text-gray-900">Rate this product</h2>
          <p className="mt-3 leading-7 text-gray-600">Your rating helps other customers choose with confidence.</p>
          {isAuthenticated ? (
            <form onSubmit={submitRating} className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex gap-1" onMouseLeave={() => setHoveredRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onMouseEnter={() => setHoveredRating(star)} onClick={() => setRating(star)} className="rounded-md p-1" aria-label={`${star} stars`}>
                    <Star size={28} className={star <= (hoveredRating || rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                  </button>
                ))}
              </div>
              <input type="text" value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} maxLength={150} required placeholder="Review title" className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#079447]" />
              <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={500} minLength={1} required rows={3} placeholder="Share a few words about your experience" className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#079447]" />
              <button disabled={submitReview.isPending} className="mt-3 rounded-xl bg-[#079447] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#057a3a] disabled:bg-gray-300">{submitReview.isPending ? "Submitting..." : "Submit review"}</button>
            </form>
          ) : (
            <button onClick={ensureLogin} className="mt-6 rounded-xl border border-[#079447] px-5 py-3 font-semibold text-[#079447] hover:bg-white">Log in to rate this product</button>
          )}
        </div>
        <div className="rounded-2xl bg-white p-6">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="text-2xl font-semibold text-gray-900">Reviews</h2><p className="mt-1 text-sm text-gray-500">What customers are saying</p></div>
            <span className="text-sm font-semibold text-[#079447]">{reviewCount} total</span>
          </div>
          <div className="mt-6 space-y-5">
            {reviewsLoading && <p className="text-sm text-gray-500">Loading reviews...</p>}
            {!reviewsLoading && !reviews.length && <p className="text-sm text-gray-500">No reviews yet. Be the first to share your experience.</p>}
            {reviews.map((review) => {
              const author = review.user_name || review.user?.name || "Verified customer";
              const score = Number(review.rating || 0);
              const text = review.review_text || review.comment || review.review || review.content;
              return <article key={review.id} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-4"><p className="font-semibold text-gray-800">{author}</p><div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className={star <= score ? "fill-amber-400 text-amber-400" : "text-gray-200"} />)}</div></div>{review.title && <h3 className="mt-2 font-semibold text-gray-800">{review.title}</h3>}{text && <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>}</article>;
            })}
          </div>
        </div>
      </section>
      {related?.length > 0 && (
        <section className="mt-20">
          <h2 className="text-3xl font-semibold text-gray-900">
            You may also like
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default Product;
