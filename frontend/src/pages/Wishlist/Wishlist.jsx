import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import Tinyleaf from "@assets/images/tinyleaf.svg";
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
    <main className="mx-auto min-h-[70vh] w-full max-w-[1280px] px-5 py-12 sm:px-8 lg:px-14">
      <header className="flex flex-col gap-5 border-b border-emerald-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className="text-[clamp(22px,1.8vw,27px)] font-bold leading-none text-[#3d3d3d]">Saved for later</span>
            <img className="h-auto w-[17px]" alt="" aria-hidden="true" src={Tinyleaf} />
          </div>
          <h1 className="mt-3 text-[clamp(40px,3.3vw,56px)] font-normal leading-[1.12] tracking-[-0.025em] text-[#3f3f3f]">Your wishlist</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">Keep track of the products you love and move them to your cart when you&apos;re ready.</p>
        </div>
        {items.length > 0 && <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#057a3a]"><Heart size={16} fill="currentColor" aria-hidden="true" /> {items.length} saved {items.length === 1 ? "item" : "items"}</div>}
      </header>

      {!items.length ? (
        <section className="mt-10 rounded-[2rem] border border-dashed border-emerald-200 bg-[#f5f7f1] px-6 py-16 text-center sm:py-20" aria-labelledby="empty-wishlist-heading">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#079447] shadow-sm"><Heart size={24} aria-hidden="true" /></span>
          <h2 id="empty-wishlist-heading" className="mt-5 text-2xl font-semibold text-gray-900">Your wishlist is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-600">Save products here to find them again quickly.</p>
          <Link to="/products" className="mt-6 inline-flex rounded-xl bg-[#079447] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#057a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]">Discover products</Link>
        </section>
      ) : (
        <section className="mt-9" aria-label="Saved products">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((product) => {
              const detailPath = `/products/${product.slug || product.id}`;
              const isMoving = moveItemToCart.isPending && Number(moveItemToCart.variables) === Number(product.id);
              const isRemoving = removeItem.isPending && Number(removeItem.variables) === Number(product.id);
              const isBusy = isMoving || isRemoving;

              return (
                <article key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/[0.06]">
                  <div className="relative bg-[#f5f7f1] p-4">
                    <Link to={detailPath} className="block overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#079447]">
                      <img src={assetUrl(product.main_image, fallbackImage)} alt={product.name} className="aspect-[1.18/1] w-full object-contain transition duration-500 group-hover:scale-105" />
                    </Link>
                    <button type="button" disabled={isBusy} onClick={() => run(() => removeItem.mutateAsync(product.id), "Removed from wishlist")} className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Remove ${product.name} from wishlist`}><Heart size={18} fill="currentColor" /></button>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#079447]">{product.category_name || product.brand_name || "SNA Sundaram"}</p>
                    <Link to={detailPath} className="mt-2 w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]"><h2 className="line-clamp-2 text-xl font-semibold leading-7 text-gray-900 transition group-hover:text-[#079447]">{product.name}</h2></Link>
                    <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-gray-500">{product.short_description || product.description || "Made with carefully selected ingredients."}</p>
                    <div className="mt-5 flex items-baseline gap-2"><span className="text-xl font-bold text-[#079447]">{formatCurrency(effectivePrice(product))}</span>{product.sale_price && <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>}</div>
                    <p className={`mt-2 text-xs font-semibold ${Number(product.stock) > 0 ? "text-[#057a3a]" : "text-red-600"}`}>{Number(product.stock) > 0 ? `${product.stock} available` : "Out of stock"}</p>
                    <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4">
                      <button type="button" disabled={isBusy} onClick={() => run(() => moveItemToCart.mutateAsync(product.id), "Moved to cart")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#079447] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#057a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:cursor-not-allowed disabled:bg-gray-300">{isMoving ? "Moving…" : <><ShoppingBag size={17} /> Move to cart</>}</button>
                      <button type="button" disabled={isBusy} onClick={() => run(() => removeItem.mutateAsync(product.id), "Removed from wishlist")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Remove ${product.name} from wishlist`}>{isRemoving ? <Spinner className="h-4 w-4 border-2 border-red-600 border-t-transparent" /> : <Trash2 size={17} />}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default Wishlist;
