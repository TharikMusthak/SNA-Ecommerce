import { useMemo, useState } from "react";
import { CheckCircle2, Heart, Minus, Pencil, Plus, ShoppingBag, Star, ThumbsUp } from "lucide-react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import Tinyleaf from "@assets/images/tinyleaf.svg";
import ProductDescription from "@components/products/ProductDescription";
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
import {
  useMarkReviewHelpful,
  useProductReviews,
  useSubmitReview,
  useUpdateReview,
} from "@hooks/useReviews";
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

const isReviewOwnedByUser = (review, user) => {
  if (!user?.id || !review) return false;

  const ownerId = review.user_id ?? review.user?.id ?? review.userId;
  return (
    (ownerId != null && String(ownerId) === String(user.id)) ||
    review.is_owner === true ||
    Number(review.is_owner) === 1
  );
};

const productGallery = (product) => {
  const source = product?.images ?? product?.gallery ?? product?.product_images;
  let images = Array.isArray(source) ? source : [];

  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source);
      images = Array.isArray(parsed) ? parsed : [source];
    } catch {
      images = [source];
    }
  }

  return [product?.main_image, ...images]
    .map((image) =>
      typeof image === "string"
        ? image
        : image?.url ?? image?.image_url ?? image?.path ?? image?.image,
    )
    .filter(Boolean)
    .filter((image, index, all) => all.indexOf(image) === index);
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
  const { isAuthenticated, user } = useAuth();
  const { data: product, isLoading, isError } = useProduct(identifier);
  const { data: related } = useRelatedProducts(product?.id);
  const { addItem } = useCart();
  const wishlist = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(product?.id);
  const submitReview = useSubmitReview(product?.id);
  const updateReview = useUpdateReview(product?.id);
  const markReviewHelpful = useMarkReviewHelpful(product?.id);

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
  const galleryImages = productGallery(product);
  const activeImage =
    selectedImage?.productId === product.id
      ? selectedImage.url
      : galleryImages[0] || product.main_image;
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
  const ratingBreakdown = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: reviews.filter((review) => Number(review.rating || 0) === score).length,
  }));
  const maxRatingCount = Math.max(...ratingBreakdown.map((item) => item.count), 1);

  const formatReviewDate = (value) => {
    if (!value) return "Recent purchase";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Recent purchase"
      : new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date);
  };

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

  const cancelReviewEdit = () => {
    setEditingReviewId(null);
    setRating(0);
    setReviewTitle("");
    setReviewText("");
  };

  const startReviewEdit = (review) => {
    if (!isReviewOwnedByUser(review, user)) {
      toast.error("You can only edit your own review");
      return;
    }

    setEditingReviewId(review.id);
    setRating(Number(review.rating || 0));
    setReviewTitle(review.title || "");
    setReviewText(
      review.review_text || review.comment || review.review || review.content || "",
    );
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

    const reviewBeingEdited = reviews.find(
      (review) => String(review.id) === String(editingReviewId),
    );

    if (editingReviewId != null && !isReviewOwnedByUser(reviewBeingEdited, user)) {
      toast.error("You can only edit your own review");
      cancelReviewEdit();
      return;
    }

    try {
      if (editingReviewId != null) {
        await updateReview.mutateAsync({
          reviewId: editingReviewId,
          rating,
          title,
          review_text,
        });
        toast.success("Your review has been updated");
      } else {
        await submitReview.mutateAsync({
          product_id: product.id,
          rating,
          title,
          review_text,
        });
        toast.success("Thanks for reviewing this product");
      }
      cancelReviewEdit();
    } catch (error) {
      toast.error(apiErrorMessage(error, editingReviewId != null ? "Could not update your review" : "Could not submit your rating"));
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1380px] px-5 py-12 sm:px-8 lg:px-14">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4 sm:flex-row">
          {galleryImages.length > 1 && (
            <div className="order-2 flex gap-3 overflow-x-auto pb-1 sm:order-1 sm:max-h-[520px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
              {galleryImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage({ productId: product.id, url: image })}
                  aria-label={`View image ${index + 1} of ${galleryImages.length}`}
                  aria-pressed={activeImage === image}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-[#f5f7f1] p-1 transition focus:outline-none focus:ring-2 focus:ring-[#079447] ${
                    activeImage === image
                      ? "border-[#079447]"
                      : "border-transparent hover:border-[#9bc9a9]"
                  }`}
                >
                  <img
                    src={assetUrl(image, fallbackImage)}
                    alt={`${product.name} view ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1 rounded-[2rem] bg-[#f5f7f1] p-8">
            <img
              src={assetUrl(activeImage, fallbackImage)}
              alt={product.name}
              className="mx-auto aspect-square w-full object-contain"
            />
          </div>
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
         <div className="mt-6 leading-7 text-gray-600">
  
</div>
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
                    {[variant.size]
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
         <ProductDescription
  description={product.description || product.short_description}
/>   </div>
       
  

 </div>
      <section className="mt-20 rounded-[2rem] border border-emerald-100 bg-[#f5f7f1] p-5 sm:p-8 lg:p-10" aria-labelledby="reviews-heading">
        <div className="flex flex-col justify-between gap-4 border-b border-emerald-100 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-1"><span className="text-[clamp(22px,1.8vw,27px)] font-bold leading-none text-[#3d3d3d]">Customer feedback</span><img className="h-auto w-[17px]" alt="" aria-hidden="true" src={Tinyleaf} /></div>
            <h2 id="reviews-heading" className="mt-3 text-3xl font-semibold text-gray-900">Loved by our customers</h2>
            <p className="mt-2 text-sm text-gray-600">Honest feedback from people who have tried this product.</p>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#079447] shadow-sm">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
              <div className="flex items-center gap-5"><span className="text-5xl font-bold tracking-tight text-gray-900">{productRating ? productRating.toFixed(1) : "—"}</span><div><div className="flex gap-0.5" aria-label={`${productRating || 0} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={18} className={star <= Math.round(productRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"} />)}</div><p className="mt-2 text-sm text-gray-500">Based on {reviewCount || "no"} customer {reviewCount === 1 ? "review" : "reviews"}</p></div></div>
              <div className="mt-6 space-y-2.5">{ratingBreakdown.map(({ score, count }) => <div key={score} className="grid grid-cols-[1.5rem_1fr_1.75rem] items-center gap-2 text-xs text-gray-500"><span>{score} star</span><div className="h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxRatingCount) * 100}%` }} /></div><span className="text-right">{count}</span></div>)}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/70 p-5">
              <h3 className="font-semibold text-gray-900">{editingReviewId != null ? "Edit your review" : "Share your experience"}</h3><p className="mt-1 text-sm leading-6 text-gray-600">{editingReviewId != null ? "Update your rating or feedback, then save your changes." : "Your review helps others shop with confidence."}</p>
              {isAuthenticated ? (
                <form onSubmit={submitRating} className="mt-5">
                  <div className="flex gap-1" onMouseLeave={() => setHoveredRating(0)}>{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" onMouseEnter={() => setHoveredRating(star)} onFocus={() => setHoveredRating(star)} onBlur={() => setHoveredRating(0)} onClick={() => setRating(star)} className="rounded-md p-1 text-gray-200 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]" aria-label={`Rate ${star} out of 5 stars`} aria-pressed={rating === star}><Star size={28} className={star <= (hoveredRating || rating) ? "fill-amber-400 text-amber-400" : "text-current"} /></button>)}</div>
                  <input type="text" value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} maxLength={150} required placeholder="Give your review a title" className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#079447] focus:ring-2 focus:ring-emerald-100" />
                  <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} maxLength={500} minLength={1} required rows={3} placeholder="What did you like about it?" className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#079447] focus:ring-2 focus:ring-emerald-100" />
                  <div className="mt-3 flex flex-wrap items-center gap-3"><button disabled={submitReview.isPending || updateReview.isPending} className="rounded-xl bg-[#079447] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#057a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:bg-gray-300">{updateReview.isPending ? "Saving..." : submitReview.isPending ? "Submitting..." : editingReviewId != null ? "Save changes" : "Submit review"}</button>{editingReviewId != null && <button type="button" disabled={updateReview.isPending} onClick={cancelReviewEdit} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-50">Cancel</button>}</div>
                </form>
              ) : <button onClick={ensureLogin} className="mt-5 rounded-xl border border-[#079447] px-4 py-2.5 text-sm font-semibold text-[#079447] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]">Log in to write a review</button>}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-end justify-between gap-4"><div><h3 className="text-xl font-semibold text-gray-900">Customer reviews</h3><p className="mt-1 text-sm text-gray-500">Most recent feedback</p></div></div>
            <div className="mt-5 space-y-0">{reviewsLoading && <p className="py-8 text-sm text-gray-500">Loading customer reviews...</p>}{!reviewsLoading && !reviews.length && <p className="py-8 text-sm leading-6 text-gray-500">No reviews yet. Be the first to tell us about your experience.</p>}{reviews.map((review) => { const author = review.reviewer || review.user?.name || "Verified customer"; const score = Number(review.rating || 0); const text = review.review_text || review.comment || review.review || review.content; const initials = author.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); const helpfulCount = Number(review.helpful_count ?? review.helpful ?? 0); const isOwnReview = isReviewOwnedByUser(review, user); return <article key={review.id} className="border-b border-gray-100 py-5 first:pt-0 last:border-0 last:pb-0"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-[#057a3a]">{initials}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-semibold text-gray-900">{author}</p><span className="inline-flex items-center gap-1 text-xs text-[#079447]"><CheckCircle2 size={13} /> Verified purchase</span></div><p className="mt-0.5 text-xs text-gray-500">{formatReviewDate(review.created_at || review.createdAt || review.date)}</p></div></div><div className="flex shrink-0 gap-0.5" aria-label={`${score} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} className={star <= score ? "fill-amber-400 text-amber-400" : "text-gray-200"} />)}</div></div>{review.title && <h4 className="mt-4 font-semibold text-gray-800">{review.title}</h4>}{text && <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>}<div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" disabled={markReviewHelpful.isPending} onClick={() => markReviewHelpful.mutate(review.id, { onError: (error) => toast.error(apiErrorMessage(error, "Could not record your feedback")) })} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-emerald-50 hover:text-[#079447] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-50" aria-label={`Mark ${author}'s review as helpful`}><ThumbsUp size={14} /> Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ""}</button>{isOwnReview && <button type="button" disabled={updateReview.isPending} onClick={() => startReviewEdit(review)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#079447] transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-50"><Pencil size={14} /> Edit review</button>}</div></article>; })}</div>
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
