import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import { getAddresses } from "@api/address.api";
import { createOrder } from "@api/order.api";
import Spinner from "@components/ui/Spinner/Spinner";
import { QUERY_KEYS } from "@config/constants";
import { useCart } from "@hooks/useCart";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl } from "@utils/helpers";

const Cart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, isLoading, updateItem, removeItem, clear, applyCoupon } =
    useCart();
  const [addressId, setAddressId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const addresses = useQuery({
    queryKey: QUERY_KEYS.addresses,
    queryFn: async () => (await getAddresses()).data.data || [],
  });

  const run = async (operation, successMessage) => {
    try {
      await operation();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Cart could not be updated"));
    }
  };

  const submitCoupon = (event) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    if (code) run(() => applyCoupon.mutateAsync(code), "Coupon applied");
  };

  const checkout = async () => {
    const selectedAddress =
      addressId || addresses.data?.find((item) => item.is_default)?.id;
    if (!selectedAddress) {
      toast.error("Select or add a delivery address");
      return;
    }
    try {
      setCheckingOut(true);
      const response = await createOrder(
        { address_id: Number(selectedAddress), payment_method: "cod" },
        crypto.randomUUID(),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders }),
      ]);
      toast.success(
        `Order ${response.data.data.order_number} placed successfully`,
      );
      navigate("/profile");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Order could not be placed"));
    } finally {
      setCheckingOut(false);
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
      <div className="flex items-end justify-between">
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
             Your Health basket

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
            Shopping cart
          </h2>
          
        </div>
        {cart.items.length > 0 && (
          <button
            onClick={() => run(() => clear.mutateAsync(), "Cart cleared")}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Clear cart
          </button>
        )}
      </div>

      {cart.items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-gray-300 px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-gray-800">
            Your cart is empty
          </h2>
          <p className="mt-2 text-gray-500">
            Explore our traditionally prepared products.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex rounded-xl bg-[#079447] px-6 py-3 font-semibold text-white"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4">
            {cart.items.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[88px_1fr] gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"
              >
                <Link
                  to={`/products/${item.slug || item.product_id}`}
                  className="aspect-square rounded-xl bg-[#f5f7f1] p-2"
                >
                  <img
                    src={assetUrl(item.main_image, fallbackImage)}
                    alt={item.name}
                    className="h-full w-full object-contain"
                  />
                </Link>
                <div>
                  <Link
                    to={`/products/${item.slug || item.product_id}`}
                    className="font-semibold text-gray-900 hover:text-[#079447]"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatCurrency(item.unit_price)} each
                  </p>
                  <div className="mt-3 inline-flex items-center rounded-lg border">
                    <button
                      disabled={item.quantity <= 1 || updateItem.isPending}
                      onClick={() =>
                        run(() =>
                          updateItem.mutateAsync({
                            itemId: item.id,
                            quantity: item.quantity - 1,
                          }),
                        )
                      }
                      className="p-2"
                      aria-label="Decrease"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-9 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      disabled={
                        item.quantity >= item.available_stock ||
                        updateItem.isPending
                      }
                      onClick={() =>
                        run(() =>
                          updateItem.mutateAsync({
                            itemId: item.id,
                            quantity: item.quantity + 1,
                          }),
                        )
                      }
                      className="p-2"
                      aria-label="Increase"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:block sm:text-right">
                  <p className="font-bold text-[#079447]">
                    {formatCurrency(item.line_total)}
                  </p>
                  <button
                    onClick={() =>
                      run(() => removeItem.mutateAsync(item.id), "Item removed")
                    }
                    className="mt-2 inline-flex items-center gap-1 text-sm text-red-600"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-3xl bg-[#f5f7f1] p-6 lg:sticky lg:top-28">
            <h2 className="text-xl font-semibold text-gray-900">
              Order summary
            </h2>
            <div className="mt-5 space-y-3 text-sm">
              <Summary label="Subtotal" value={cart.summary.subtotal} />
              <Summary label="Tax" value={cart.summary.tax} />
              <Summary label="Shipping" value={cart.summary.shipping} />
              <Summary label="Discount" value={-cart.summary.discount} />
              <div className="border-t border-gray-300 pt-4">
                <Summary label="Total" value={cart.summary.total} strong />
              </div>
            </div>
            <form onSubmit={submitCoupon} className="mt-6 flex gap-2">
              <input
                name="code"
                placeholder="Coupon code"
                className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#079447]"
              />
              <button className="rounded-xl border border-[#079447] px-4 py-2 text-sm font-semibold text-[#079447]">
                Apply
              </button>
            </form>
            <label className="mt-6 block text-sm font-semibold text-gray-700">
              Delivery address
              <select
                value={addressId}
                onChange={(event) => setAddressId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-[#079447]"
              >
                <option value="">Choose an address</option>
                {addresses.data?.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.full_name} — {address.city}, {address.postal_code}
                  </option>
                ))}
              </select>
            </label>
            {!addresses.isLoading && !addresses.data?.length && (
              <Link
                to="/profile"
                className="mt-2 block text-sm font-semibold text-[#079447]"
              >
                Add a delivery address
              </Link>
            )}
            <p className="mt-4 text-xs text-gray-500">
              Payment method: Cash on delivery
            </p>
            <button
              onClick={checkout}
              disabled={checkingOut || !addresses.data?.length}
              className="mt-5 w-full rounded-xl bg-[#079447] px-5 py-3 font-semibold text-white hover:bg-[#057a3a] disabled:bg-gray-300"
            >
              {checkingOut ? "Placing order…" : "Place order"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
};

const Summary = ({ label, value, strong }) => (
  <div
    className={`flex justify-between gap-4 ${strong ? "text-lg font-bold text-gray-900" : "text-gray-600"}`}
  >
    <span>{label}</span>
    <span>{formatCurrency(value)}</span>
  </div>
);

export default Cart;
