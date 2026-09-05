import { Heart, Star } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import { useAuth } from "@context/AuthProvider";
import { useCart } from "@hooks/useCart";
import { useProductReviews } from "@hooks/useReviews";
import { useWishlist } from "@hooks/useWishlist";
import ProductPrice from "@components/products/ProductPrice";
import { assetUrl } from "@utils/helpers";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const {
    items,
    addItem: addFavorite,
    removeItem: removeFavorite,
  } = useWishlist();
  const isFavorite = items.some(
    (item) => Number(item.id) === Number(product.id),
  );
  const { data: reviewsData } = useProductReviews(product.id);
  const detailPath = `/products/${product.slug || product.id}`;
  const reviews = reviewsData?.items || [];
  const fetchedRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) /
      reviews.length
    : 0;
  const rating = Number(product.average_rating ?? product.rating ?? fetchedRating);
  const reviewCount = Number(
    product.review_count ??
      product.reviews_count ??
      reviewsData?.pagination?.total ??
      reviews.length,
  );
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

  const toggleWishlist = async () => {
    if (!requireLogin()) return;
    try {
      if (isFavorite) await removeFavorite.mutateAsync(product.id);
      else await addFavorite.mutateAsync(product.id);
      toast.success(isFavorite ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not update wishlist"));
    }
  };

  return (
    <article className="group overflow-hidden rounded-[100px] rounded-t-[500px] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link
        to={detailPath}
        className="block  overflow-hidden bg-white p-3"
      >
        <img
          src={assetUrl(product.main_image, fallbackImage)}
          alt={product.name}
          className=" w-full rounded-[100px] rounded-t-[500px] object-contain transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#079447]">
              {product.category_name || product.brand_name || "SNA Sundaram"}
            </p>
            <Link to={detailPath}>
              <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-gray-800 hover:text-[#079447]">
                {product.name}
              </h3>
            </Link>
          </div>
          <button
            onClick={toggleWishlist}
            aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
            className={`rounded-full p-2 transition ${isFavorite ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500 hover:text-red-600"}`}
          >
            <Heart size={19} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        {/* <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
          {product.short_description || product.description || "Made with carefully selected ingredients."}
        </p> */}
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <Star size={16} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold text-gray-800">{rating ? rating.toFixed(1) : "New"}</span>
          <span className="text-gray-400">
            {reviewCount ? `(${reviewCount} review${reviewCount === 1 ? "" : "s"})` : "No reviews yet"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <ProductPrice
              product={product}
              currentClassName="text-lg font-bold text-[#079447]"
              originalClassName="ml-2 text-sm text-gray-400"
            />
          </div>
          <button
            disabled={addItem.isPending || Number(product.stock) < 1}
            onClick={addToCart}
            className="p-2 px-3  flex items-center justify-center rounded-[50px] bg-[#079447] text-white transition hover:bg-[#057a3a] disabled:bg-gray-300"
            aria-label="Add to cart"
          >
            Add to cart
          </button>
        </div>
        <p
          className={`mt-2 text-xs font-medium ${Number(product.stock) > 0 ? "text-gray-500" : "text-red-600"}`}
        >
          {Number(product.stock) > 0
            ? `${product.stock} available`
            : "Out of stock"}
        </p>
      </div>
    </article>
  );
};

export default ProductCard;
