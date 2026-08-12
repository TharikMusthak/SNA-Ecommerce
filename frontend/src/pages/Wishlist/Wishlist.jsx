import { ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import Spinner from "@components/ui/Spinner/Spinner";
import { useWishlist } from "@hooks/useWishlist";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl, effectivePrice } from "@utils/helpers";

const Wishlist = () => {
  const { items, isLoading, removeItem, moveItemToCart } = useWishlist();
  const run = async (operation, message) => {
    try {
      await operation();
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Wishlist could not be updated"));
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:px-14">
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
             Saved For Later
            </span>

           
              
          </div>
           <h2
            className="
              text-[clamp(43px,3.3vw,56px)]
              font-regular
              leading-[1.12]
              tracking-[-0.025em]
              text-[#3f3f3f]
            "
          >
            Your wishlist
          </h2>
       
      {!items.length ? (
        <div className="mt-12 rounded-3xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-500">Your wishlist is empty.</p>
          <Link
            to="/products"
            className="mt-5 inline-flex rounded-xl bg-[#079447] px-6 py-3 font-semibold text-white"
          >
            Discover products
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map((product) => (
            <article
              key={product.id}
              className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4"
            >
              <Link
                to={`/products/${product.slug || product.id}`}
                className="h-28 w-28 shrink-0 rounded-xl bg-[#f5f7f1] p-2"
              >
                <img
                  src={assetUrl(product.main_image, fallbackImage)}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/products/${product.slug || product.id}`}
                  className="font-semibold text-gray-900 hover:text-[#079447]"
                >
                  {product.name}
                </Link>
                <p className="mt-2 font-bold text-[#079447]">
                  {formatCurrency(effectivePrice(product))}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      run(
                        () => moveItemToCart.mutateAsync(product.id),
                        "Moved to cart",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#079447] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <ShoppingBag size={16} /> Move to cart
                  </button>
                  <button
                    onClick={() =>
                      run(
                        () => removeItem.mutateAsync(product.id),
                        "Removed from wishlist",
                      )
                    }
                    className="inline-flex items-center gap-1 px-2 py-2 text-sm text-red-600"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default Wishlist;
