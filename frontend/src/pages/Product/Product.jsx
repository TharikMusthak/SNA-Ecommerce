import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Camera, CheckCircle2, ChevronLeft, ChevronRight, Heart, Minus, Pencil, Play, Plus, ShoppingBag, Star, ThumbsUp, Trash2, Video, X } from "lucide-react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import Tinyleaf from "@assets/images/tinyleaf.svg";
import ProductDescription from "@components/products/ProductDescription";
import ProductImageGallery from "@components/products/ProductImageGallery";
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
  useDeleteReview,
  useMarkReviewHelpful,
  useProductReviews,
  useSubmitReview,
  useUpdateReview,
} from "@hooks/useReviews";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl, effectivePrice } from "@utils/helpers";

export function extractReviewMedia(review) {
  if (!review) return [];
  const list = [];

  const addMedia = (item, defaultType = "image") => {
    if (!item) return;
    let url = "";
    let type = defaultType;
    if (typeof item === "string") {
      url = item.trim();
    } else if (typeof item === "object") {
      url =
        item.url ||
        item.image_url ||
        item.video_url ||
        item.image ||
        item.video ||
        item.media ||
        item.path ||
        item.src ||
        item.file_path ||
        "";
      if (item.type) type = item.type;
    }
    if (!url) return;

    if (/\.(mp4|webm|mov|avi|mkv|ogg)($|\?)/i.test(url)) {
      type = "video";
    } else if (/\.(jpg|jpeg|png|webp|gif|svg|avif)($|\?)/i.test(url)) {
      type = "image";
    }

    const fullUrl = assetUrl(url);
    if (fullUrl && !list.some((m) => m.url === fullUrl)) {
      list.push({ url: fullUrl, type, original: url });
    }
  };

  const processArray = (arr, type) => {
    if (!arr) return;
    if (Array.isArray(arr)) {
      arr.forEach((i) => addMedia(i, type));
    } else if (typeof arr === "string") {
      const trimmed = arr.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((i) => addMedia(i, type));
            return;
          }
        } catch {
          // ignore
        }
      }
      trimmed.split(",").forEach((i) => addMedia(i, type));
    }
  };

  processArray(review.photos, "image");
  processArray(review.images, "image");
  processArray(review.videos, "video");
  processArray(review.media, "image");
  if (review.image_url) addMedia(review.image_url, "image");
  if (review.imageUrl) addMedia(review.imageUrl, "image");
  if (review.video_url) addMedia(review.video_url, "video");
  if (review.videoUrl) addMedia(review.videoUrl, "video");

  return list;
}

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

const HELPFUL_STORAGE_KEY_PREFIX = "sna_helpful_reviews_";

const getSavedHelpfulReviews = (userId) => {
  try {
    const key = `${HELPFUL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveHelpfulReviews = (userId, map) => {
  try {
    const key = `${HELPFUL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const ProductDetail = ({ identifier }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id || user?.email || "guest";
  const { data: product, isLoading, isError } = useProduct(identifier);

  const reviewFormRef = useRef(null);
  const [formHeight, setFormHeight] = useState(null);

   const { data: related } = useRelatedProducts(product?.id);
  const { addItem } = useCart();
  const wishlist = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewMedia, setReviewMedia] = useState([]);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewTouched, setReviewTouched] = useState({});
  const [localHelpfulMap, setLocalHelpfulMap] = useState(() => getSavedHelpfulReviews(userId));
  const [lightboxMedia, setLightboxMedia] = useState(null);

  useEffect(() => {
    setLocalHelpfulMap(getSavedHelpfulReviews(userId));
  }, [userId]);


  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(product?.id);
  const submitReview = useSubmitReview(product?.id);
  const updateReview = useUpdateReview(product?.id);
  const deleteReview = useDeleteReview(product?.id);
  const markReviewHelpful = useMarkReviewHelpful(product?.id);

  useEffect(
    () => () => {
      reviewMedia.forEach((media) => URL.revokeObjectURL(media.previewUrl));
    },
    [reviewMedia],
  );

  const reviews = useMemo(() => reviewsData?.items || [], [reviewsData]);

  const allCustomerReviewMedia = useMemo(() => {
    if (!reviews || !reviews.length) return [];
    const mediaList = [];
    reviews.forEach((rev) => {
      const extracted = extractReviewMedia(rev);
      extracted.forEach((item) => {
        if (!mediaList.some((m) => m.url === item.url)) {
          mediaList.push({
            ...item,
            reviewId: rev.id,
            reviewer: rev.reviewer || rev.user?.name || "Customer",
          });
        }
      });
    });
    return mediaList;
  }, [reviews]);

  useEffect(() => {
    const node = reviewFormRef.current;
    if (!node) return;

    const updateHeight = () => {
      if (node) {
        setFormHeight(node.offsetHeight);
      }
    };

    updateHeight();

    let observer = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateHeight);
      observer.observe(node);
    }
    window.addEventListener("resize", updateHeight);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [
    isLoading,
    reviewsLoading,
    reviews,
    product?.id,
    reviewMedia,
    reviewErrors,
    editingReviewId,
    isAuthenticated,
  ]);

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

  const validateSingleReviewField = (name, value) => {
    switch (name) {
      case "rating": {
        const score = Number(value);
        if (!score || score < 1 || score > 5) return "Please select a star rating";
        return "";
      }
      case "reviewText": {
        if (!value || !value.trim()) return "Please enter your review text";
        return "";
      }
      default:
        return "";
    }
  };

  const cancelReviewEdit = () => {
    reviewMedia.forEach((media) => URL.revokeObjectURL(media.previewUrl));
    setEditingReviewId(null);
    setRating(0);
    setHoveredRating(0);
    setReviewTitle("");
    setReviewText("");
    setReviewMedia([]);
    setReviewErrors({});
    setReviewTouched({});
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
    setReviewMedia([]);
    setReviewErrors({});
    setReviewTouched({});
  };

  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
  const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit

  const formatFileSize = (bytes) => {
    if (!bytes) return "0KB";
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }
    return `${Math.round(bytes / 1024)}KB`;
  };

  const validateReviewMediaFiles = (files) => {
    const nextMedia = [];
    let mediaError = "";

    for (const file of files) {
      const isImage = file.type.startsWith("image/") || ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif"].includes(file.type);
      const isVideo = file.type.startsWith("video/") || ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);

      if (!isImage && !isVideo) {
        mediaError = `Unsupported file format: ${file.name}. Please upload an image or video.`;
        continue;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
        mediaError = `Image "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed size of 5MB.`;
        continue;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        mediaError = `Video "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum allowed size of 50MB.`;
        continue;
      }

      nextMedia.push({
        id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
        file,
        type: isImage ? "image" : "video",
        previewUrl: URL.createObjectURL(file),
      });
    }
    return { nextMedia, mediaError };
  };

  const handleReviewMediaAdd = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const { nextMedia, mediaError: fileTypeError } = validateReviewMediaFiles(files);

    if (!nextMedia.length) {
      if (fileTypeError) {
        setReviewErrors((prev) => ({ ...prev, media: fileTypeError }));
      }
      event.target.value = "";
      return;
    }

    setReviewMedia((current) => {
      const currentImages = current.filter((m) => m.type === "image");
      const currentVideos = current.filter((m) => m.type === "video");

      const incomingImages = nextMedia.filter((m) => m.type === "image");
      const incomingVideos = nextMedia.filter((m) => m.type === "video");

      let errorMsg = fileTypeError || "";

      const finalImages = [...currentImages];
      if (incomingImages.length > 0) {
        if (currentImages.length >= 1) {
          errorMsg = "Maximum 1 image allowed per review.";
          incomingImages.forEach((m) => URL.revokeObjectURL(m.previewUrl));
        } else {
          finalImages.push(incomingImages[0]);
          if (incomingImages.length > 1) {
            errorMsg = "Only 1 image allowed; extra images were ignored.";
            incomingImages.slice(1).forEach((m) => URL.revokeObjectURL(m.previewUrl));
          }
        }
      }

      const finalVideos = [...currentVideos];
      if (incomingVideos.length > 0) {
        if (currentVideos.length >= 1) {
          errorMsg = errorMsg || "Maximum 1 video allowed per review.";
          incomingVideos.forEach((m) => URL.revokeObjectURL(m.previewUrl));
        } else {
          finalVideos.push(incomingVideos[0]);
          if (incomingVideos.length > 1) {
            errorMsg = errorMsg || "Only 1 video allowed; extra videos were ignored.";
            incomingVideos.slice(1).forEach((m) => URL.revokeObjectURL(m.previewUrl));
          }
        }
      }

      setReviewErrors((prev) => ({ ...prev, media: errorMsg }));
      return [...finalImages, ...finalVideos];
    });

    event.target.value = "";
  };

  const removeReviewMedia = (mediaId) => {
    setReviewMedia((current) => {
      const target = current.find((item) => item.id === mediaId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== mediaId);
    });
    setReviewErrors((prev) => ({ ...prev, media: "" }));
  };

  const submitRating = async (event) => {
    event.preventDefault();
    if (!ensureLogin()) return;
    if (!product?.id) {
      toast.error("Product is required");
      return;
    }

    setReviewTouched({
      rating: true,
      reviewText: true,
      media: true,
    });

    const ratingErr = validateSingleReviewField("rating", rating);
    const textErr = validateSingleReviewField("reviewText", reviewText);

    let mediaErr = "";
    const imageCount = reviewMedia.filter((m) => m.type === "image").length;
    const videoCount = reviewMedia.filter((m) => m.type === "video").length;
    if (imageCount > 1) mediaErr = "Maximum 1 image allowed per review.";
    else if (videoCount > 1) mediaErr = "Maximum 1 video allowed per review.";

    for (const item of reviewMedia) {
      if (item.file) {
        if (item.type === "image" && item.file.size > MAX_IMAGE_SIZE_BYTES) {
          mediaErr = `Image "${item.file.name}" (${formatFileSize(item.file.size)}) exceeds maximum allowed size of 5MB.`;
          break;
        }
        if (item.type === "video" && item.file.size > MAX_VIDEO_SIZE_BYTES) {
          mediaErr = `Video "${item.file.name}" (${formatFileSize(item.file.size)}) exceeds maximum allowed size of 50MB.`;
          break;
        }
      }
    }

    const errors = {};
    if (ratingErr) errors.rating = ratingErr;
    if (textErr) errors.reviewText = textErr;
    if (mediaErr) errors.media = mediaErr;

    setReviewErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const title = reviewTitle.trim();
    const review_text = reviewText.trim();

    const reviewBeingEdited = reviews.find(
      (review) => String(review.id) === String(editingReviewId),
    );

    if (editingReviewId != null && !isReviewOwnedByUser(reviewBeingEdited, user)) {
      toast.error("You can only edit your own review");
      cancelReviewEdit();
      return;
    }

    try {
      const payload = {
        rating: String(rating),
        title,
        review_text,
      };
      reviewMedia.forEach(({ file, type }) => {
        payload[type] = file;
      });
      if (editingReviewId != null) {
        await updateReview.mutateAsync({
          reviewId: editingReviewId,
          payload,
        });
        toast.success("Your review has been updated");
      } else {
        payload.product_id = String(product.id);
        await submitReview.mutateAsync(payload);
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
        <div>
          <ProductImageGallery
            product={product}
            selectedVariant={selectedVariant}
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
         <div className="mt-6 leading-7 text-gray-600">
  <ProductDescription
  description={product.description || product.short_description}
/>
</div>
       
         
        </div>
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

        {/* Rating Breakdown Banner */}
        <div className="mt-7 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.03]">
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-center md:divide-x md:divide-gray-100">
            <div className="flex items-center gap-5 md:pr-6">
              <span className="text-5xl font-bold tracking-tight text-gray-900">{productRating ? productRating.toFixed(1) : "—"}</span>
              <div>
                <div className="flex gap-0.5" aria-label={`${productRating || 0} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={18} className={star <= Math.round(productRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"} />)}
                </div>
                <p className="mt-2 text-sm text-gray-500">Based on {reviewCount || "no"} customer {reviewCount === 1 ? "review" : "reviews"}</p>
              </div>
            </div>
            <div className="space-y-2.5 md:pl-6">
              {ratingBreakdown.map(({ score, count }) => (
                <div key={score} className="grid grid-cols-[1.5rem_1fr_1.75rem] items-center gap-2 text-xs text-gray-500">
                  <span>{score} star</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxRatingCount) * 100}%` }} />
                  </div>
                  <span className="text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Review Form (Left) & Customer Reviews (Right) - Heights Match Exactly */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div ref={reviewFormRef} className="flex flex-col rounded-2xl border border-emerald-100 bg-white/90 p-5 sm:p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">{editingReviewId != null ? "Edit your review" : "Share your experience"}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">{editingReviewId != null ? "Update your rating or feedback, then save your changes." : "Your review helps others shop with confidence."}</p>
            {isAuthenticated ? (
              <form onSubmit={submitRating} className="mt-5" noValidate>
                {/* Star Rating Section */}
                <div>
                  <div className="flex gap-1" onMouseLeave={() => setHoveredRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredRating(star)}
                        onFocus={() => setHoveredRating(star)}
                        onBlur={() => setHoveredRating(0)}
                        onClick={() => {
                          setRating(star);
                          setReviewTouched((prev) => ({ ...prev, rating: true }));
                          setReviewErrors((prev) => ({
                            ...prev,
                            rating: validateSingleReviewField("rating", star),
                          }));
                        }}
                        className="rounded-md p-1 text-gray-200 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]"
                        aria-label={`Rate ${star} out of 5 stars`}
                        aria-pressed={rating === star}
                      >
                        <Star
                          size={28}
                          className={
                            star <= (hoveredRating || rating)
                              ? "fill-amber-400 text-amber-400"
                              : reviewErrors.rating
                              ? "text-red-300"
                              : "text-current"
                          }
                        />
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                    {reviewErrors.rating && (
                      <>
                        <AlertCircle size={12} className="shrink-0 text-red-600" />
                        <span>{reviewErrors.rating}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Review Title Input */}
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(event) => setReviewTitle(event.target.value)}
                  maxLength={150}
                  placeholder="Give your review a title (optional)"
                  className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#079447] focus:ring-2 focus:ring-emerald-100 placeholder:text-gray-400"
                />

                {/* Review Text Textarea */}
                <div className="mt-3">
                  <textarea
                    value={reviewText}
                    onChange={(event) => {
                      const val = event.target.value;
                      setReviewText(val);
                      if (reviewTouched.reviewText) {
                        setReviewErrors((prev) => ({
                          ...prev,
                          reviewText: validateSingleReviewField("reviewText", val),
                        }));
                      }
                    }}
                    onBlur={() => {
                      setReviewTouched((prev) => ({ ...prev, reviewText: true }));
                      setReviewErrors((prev) => ({
                        ...prev,
                        reviewText: validateSingleReviewField("reviewText", reviewText),
                      }));
                    }}
                    maxLength={500}
                    rows={3}
                    placeholder="What did you like about it?"
                    aria-invalid={Boolean(reviewErrors.reviewText)}
                    className={`w-full resize-none rounded-xl border ${
                      reviewErrors.reviewText
                        ? "border-red-400 bg-red-50/20 text-[#333] focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
                        : "border-gray-200 bg-white text-gray-800 focus:border-[#079447] focus:ring-2 focus:ring-emerald-100"
                    } px-4 py-3 text-sm outline-none transition placeholder:text-gray-400`}
                  />
                  <p className="mt-0.5 flex min-h-[14px] items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                    {reviewErrors.reviewText && (
                      <>
                        <AlertCircle size={12} className="shrink-0 text-red-600" />
                        <span>{reviewErrors.reviewText}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Media Upload Section */}
                {(() => {
                  const hasImage = reviewMedia.some((m) => m.type === "image");
                  const hasVideo = reviewMedia.some((m) => m.type === "video");
                  const isMediaMaxed = hasImage && hasVideo;

                  return (
                    <div className={`mt-4 rounded-xl border ${reviewErrors.media ? "border-red-300 bg-red-50/10" : "border-gray-200 bg-white"} p-4`}>
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-gray-900">Add a photo or video (Optional)</p>
                        <span className="text-[11px] font-medium text-gray-400">
                          {hasImage ? "1/1 Image" : "0/1 Image"} · {hasVideo ? "1/1 Video" : "0/1 Video"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Shoppers find images and videos helpful. Max 1 image (up to 5MB) and 1 video (up to 50MB) allowed.
                      </p>
                      
                      <div className="mt-3.5 flex flex-wrap items-center gap-3">
                        {/* Plus Upload Box */}
                        {!isMediaMaxed ? (
                          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#079447] hover:bg-emerald-50/40 group">
                            <div className="flex items-center text-gray-400 group-hover:text-[#079447]">
                              <Camera size={20} />
                              <Plus size={12} className="-ml-0.5" />
                            </div>
                            <span className="mt-1 text-[11px] font-medium text-gray-600 group-hover:text-[#079447]">Add media</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,video/mp4,video/webm,video/quicktime"
                              multiple
                              className="hidden"
                              onChange={handleReviewMediaAdd}
                            />
                          </label>
                        ) : (
                          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-2 text-center text-gray-400">
                            <Camera size={18} />
                            <span className="mt-1 text-[10px] font-medium leading-tight">Media limit reached</span>
                          </div>
                        )}

                        {/* Selected Media Thumbnails */}
                        {reviewMedia.map((media, mIdx) => (
                          <div key={media.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-xs group">
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxMedia({
                                  items: reviewMedia.map((m) => ({
                                    url: m.previewUrl,
                                    type: m.type,
                                  })),
                                  activeIndex: mIdx,
                                })
                              }
                              className="h-full w-full focus:outline-none"
                            >
                              {media.type === "image" ? (
                                <img src={media.previewUrl} alt={media.file.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                              ) : (
                                <div className="relative flex h-full w-full items-center justify-center bg-black">
                                  <video src={media.previewUrl} className="h-full w-full object-cover opacity-80" />
                                  <div className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs">
                                    <Play size={12} className="ml-0.5 fill-white" />
                                  </div>
                                </div>
                              )}
                            </button>

                            {/* Delete Badge Button */}
                            <button
                              type="button"
                              onClick={() => removeReviewMedia(media.id)}
                              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-600 focus:outline-none"
                              aria-label="Remove media"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {reviewErrors.media && (
                        <p className="mt-2.5 flex items-center gap-1 text-[11px] font-medium leading-4 text-red-600">
                          <AlertCircle size={12} className="shrink-0 text-red-600" />
                          <span>{reviewErrors.media}</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    disabled={submitReview.isPending || updateReview.isPending}
                    className="rounded-xl bg-[#079447] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#057a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:bg-gray-300"
                  >
                    {updateReview.isPending ? "Saving..." : submitReview.isPending ? "Submitting..." : editingReviewId != null ? "Save changes" : "Submit review"}
                  </button>
                  {editingReviewId != null && (
                    <button
                      type="button"
                      disabled={updateReview.isPending}
                      onClick={cancelReviewEdit}
                      className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : <button onClick={ensureLogin} className="mt-5 rounded-xl border border-[#079447] px-4 py-2.5 text-sm font-semibold text-[#079447] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]">Log in to write a review</button>}
          </div>
          <div
            style={formHeight ? { height: `${formHeight}px` } : {}}
            className="flex flex-col rounded-2xl bg-white p-5 shadow-sm sm:p-6 transition-[height] duration-200"
          >
            <div className="flex shrink-0 items-end justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Customer reviews</h3>
                <p className="mt-1 text-sm text-gray-500">Most recent feedback</p>
              </div>
            </div>

            {/* Customer Photos & Videos Gallery Strip */}
            {allCustomerReviewMedia.length > 0 && (
              <div className="mt-5 shrink-0 rounded-2xl border border-emerald-100 bg-[#f5f7f1]/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#079447]">
                  Photos & videos from customers
                </p>
                <div className="no-scrollbar mt-3 flex items-center gap-3 overflow-x-auto pb-1">
                  {allCustomerReviewMedia.map((item, idx) => (
                    <button
                      key={`all-media-${item.url}-${idx}`}
                      type="button"
                      onClick={() => setLightboxMedia({ items: allCustomerReviewMedia, activeIndex: idx })}
                      className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-[#079447] hover:shadow-md focus:outline-none"
                      aria-label="View customer photo/video"
                    >
                      {item.type === "image" ? (
                        <img src={item.url} alt="Customer upload" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="relative flex h-full w-full items-center justify-center bg-black">
                          <video src={item.url} className="h-full w-full object-cover opacity-80" />
                          <div className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs">
                            <Play size={12} className="ml-0.5 fill-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex-1 min-h-0 overflow-y-auto pr-2 space-y-0">
              {reviewsLoading && <p className="py-8 text-sm text-gray-500">Loading customer reviews...</p>}
              {!reviewsLoading && !reviews.length && (
                <p className="py-8 text-sm leading-6 text-gray-500">
                  No reviews yet. Be the first to tell us about your experience.
                </p>
              )}
              {reviews.map((review) => {
                const author = review.reviewer || review.user?.name || "Verified customer";
                const score = Number(review.rating || 0);
                const text = review.review_text || review.comment || review.review || review.content;
                const initials = author.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                const isOwnReview = isReviewOwnedByUser(review, user);
                const reviewMediaList = extractReviewMedia(review);

                const initialHelpful = Boolean(
                  review.is_helpful ??
                  review.isHelpful ??
                  review.user_helpful ??
                  review.is_voted ??
                  review.voted ??
                  review.user_voted ??
                  review.helpful_by_me ??
                  review.voted_by_me ??
                  (Array.isArray(review.helpful_users) && user?.id != null && review.helpful_users.some((id) => String(id) === String(user.id)))
                );
                const isHelpful = localHelpfulMap[review.id] ?? initialHelpful;
                const rawHelpfulCount = Number(review.helpful_count ?? review.helpful ?? 0);
                const helpfulCount = isHelpful && !initialHelpful
                  ? rawHelpfulCount + 1
                  : !isHelpful && initialHelpful
                  ? Math.max(0, rawHelpfulCount - 1)
                  : rawHelpfulCount;

                return (
                  <article key={review.id} className="border-b border-gray-100 py-5 first:pt-0 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-[#057a3a]">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="font-semibold text-gray-900">{author}</p>
                            <span className="inline-flex items-center gap-1 text-xs text-[#079447]">
                              <CheckCircle2 size={13} /> Verified purchase
                            </span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                            <span>{formatReviewDate(review.created_at || review.createdAt || review.date)}</span>
                            {Boolean(review.is_edited) && <span aria-label="Review edited">· Edited</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-0.5" aria-label={`${score} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={15}
                            className={star <= score ? "fill-amber-400 text-amber-400" : "text-gray-200"}
                          />
                        ))}
                      </div>
                    </div>

                    {review.title && <h4 className="mt-4 font-semibold text-gray-800">{review.title}</h4>}
                    {text && <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>}

                    {/* Customer Review Media Thumbnails */}
                    {reviewMediaList.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-2.5">
                        {reviewMediaList.map((media, mIdx) => (
                          <button
                            key={`rev-media-${media.url}-${mIdx}`}
                            type="button"
                            onClick={() => setLightboxMedia({ items: reviewMediaList, activeIndex: mIdx })}
                            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-[#079447] hover:shadow-md focus:outline-none"
                            aria-label={`View review ${media.type}`}
                          >
                            {media.type === "image" ? (
                              <img
                                src={media.url}
                                alt="Customer review photo"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="relative flex h-full w-full items-center justify-center bg-black">
                                <video src={media.url} className="h-full w-full object-cover opacity-80" />
                                <div className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs">
                                  <Play size={12} className="ml-0.5 fill-white" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={markReviewHelpful.isPending}
                        onClick={() => {
                          const nextHelpful = !isHelpful;
                          setLocalHelpfulMap((prev) => {
                            const updated = { ...prev, [review.id]: nextHelpful };
                            saveHelpfulReviews(userId, updated);
                            return updated;
                          });
                          markReviewHelpful.mutate(review.id, {
                            onError: (error) => {
                              setLocalHelpfulMap((prev) => {
                                const reverted = { ...prev, [review.id]: isHelpful };
                                saveHelpfulReviews(userId, reverted);
                                return reverted;
                              });
                              toast.error(apiErrorMessage(error, "Could not record your feedback"));
                            },
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-50 ${
                          isHelpful
                            ? "bg-emerald-50 text-[#079447]"
                            : "text-gray-500 hover:bg-emerald-50 hover:text-[#079447]"
                        }`}
                        aria-label={`Mark ${author}'s review as helpful`}
                      >
                        <ThumbsUp size={14} className={isHelpful ? "fill-[#079447] text-[#079447]" : ""} /> Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ""}
                      </button>
                      {isOwnReview && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={updateReview.isPending || deleteReview.isPending}
                            onClick={() => startReviewEdit(review)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-[#079447] transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-50"
                          >
                            <Pencil size={14} /> Edit review
                          </button>
                          <button
                            type="button"
                            disabled={updateReview.isPending || deleteReview.isPending}
                            onClick={() => setDeletingReviewId(review.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                          >
                            <Trash2 size={14} /> Delete review
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
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

      {/* Review Media Lightbox Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxMedia(null)}
        >
          {/* Header Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            <span className="text-sm font-medium text-white/80">
              {lightboxMedia.activeIndex + 1} / {lightboxMedia.items.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxMedia(null)}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/40"
              aria-label="Close preview"
            >
              <X size={24} />
            </button>
          </div>

          {/* Active Media Display */}
          <div
            className="relative flex h-full max-h-[85vh] w-full max-w-5xl items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxMedia.items[lightboxMedia.activeIndex]?.type === "image" ? (
              <img
                src={lightboxMedia.items[lightboxMedia.activeIndex].url}
                alt="Customer review media enlarged"
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <video
                src={lightboxMedia.items[lightboxMedia.activeIndex].url}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-lg bg-black shadow-2xl"
              />
            )}

            {/* Prev / Next controls */}
            {lightboxMedia.items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxMedia((prev) => ({
                      ...prev,
                      activeIndex:
                        prev.activeIndex === 0
                          ? prev.items.length - 1
                          : prev.activeIndex - 1,
                    }))
                  }
                  className="absolute left-2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                  aria-label="Previous media"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxMedia((prev) => ({
                      ...prev,
                      activeIndex:
                        prev.activeIndex === prev.items.length - 1
                          ? 0
                          : prev.activeIndex + 1,
                    }))
                  }
                  className="absolute right-2 rounded-full bg-white/20 p-3 text-white transition hover:bg-white/40"
                  aria-label="Next media"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {lightboxMedia.items.length > 1 && (
            <div
              className="absolute bottom-4 z-50 flex max-w-xl items-center gap-2 overflow-x-auto rounded-2xl bg-black/60 p-2 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxMedia.items.map((item, idx) => (
                <button
                  key={`lightbox-${item.url}-${idx}`}
                  type="button"
                  onClick={() =>
                    setLightboxMedia((prev) => ({ ...prev, activeIndex: idx }))
                  }
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    idx === lightboxMedia.activeIndex
                      ? "border-[#079447] scale-110"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  {item.type === "image" ? (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="relative flex h-full w-full items-center justify-center bg-black">
                      <video src={item.url} className="h-full w-full object-cover opacity-70" />
                      <Play size={12} className="absolute text-white fill-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Review Confirmation Modal */}
      {deletingReviewId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setDeletingReviewId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Review</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to delete your review? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleteReview.isPending}
                onClick={() => setDeletingReviewId(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteReview.isPending}
                onClick={async () => {
                  try {
                    await deleteReview.mutateAsync(deletingReviewId);
                    toast.success("Review deleted successfully");
                    if (editingReviewId === deletingReviewId) {
                      cancelReviewEdit();
                    }
                    setDeletingReviewId(null);
                  } catch (error) {
                    toast.error(apiErrorMessage(error, "Could not delete review"));
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteReview.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Product;
