import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CreditCard, MapPin, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import { getAddresses } from "@api/address.api";
import { createOrder } from "@api/order.api";
import { createRazorpayPaymentOrder, verifyRazorpayPayment } from "@api/payment.api";
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
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const addresses = useQuery({
    queryKey: QUERY_KEYS.addresses,
    queryFn: async () => {
      const savedAddresses = (await getAddresses()).data.data || [];
      return savedAddresses.map((address) => ({
        ...address,
        is_default: Number(address.is_default) === 1,
      }));
    },
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
        { address_id: Number(selectedAddress), payment_method: paymentMethod },
        crypto.randomUUID(),
      );
      const order = response.data.data || response.data;

      if (paymentMethod === "razorpay") {
        if (!order.payment_id) throw new Error("The order was created without a payment reference.");
        await loadRazorpayCheckout();
        const paymentResponse = await createRazorpayPaymentOrder(order.payment_id);
        const paymentOrder = paymentResponse.data.data || paymentResponse.data;
        const checkoutResponse = await openRazorpayCheckout(paymentOrder);
        const verification = await verifyRazorpayPayment(order.payment_id, checkoutResponse);
        const verificationData = verification.data.data || verification.data;
        if (!verificationData.verified) throw new Error("Razorpay payment verification failed.");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders }),
      ]);
      toast.success(
        paymentMethod === "razorpay"
          ? `Payment verified for order ${order.order_number}`
          : `Order ${order.order_number} placed successfully`,
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
            <section className="mt-7 border-t border-emerald-100 pt-6" aria-labelledby="delivery-address-heading">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2"><span className="rounded-lg bg-emerald-100 p-2 text-[#079447]"><MapPin size={17} /></span><div><h3 id="delivery-address-heading" className="text-sm font-semibold text-gray-900">Delivery address</h3><p className="mt-0.5 text-xs text-gray-500">Choose where we should deliver your order.</p></div></div>
                <Link to="/profile" className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#079447] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]">Manage</Link>
              </div>
              {addresses.isLoading ? (
                <div className="mt-4 rounded-xl border border-white bg-white/70 px-4 py-5 text-center text-sm text-gray-500">Loading your saved addresses…</div>
              ) : addresses.data?.length ? (
                <div className="mt-4 max-h-[19.5rem] space-y-3 overflow-y-auto pr-1.5 [scrollbar-gutter:stable]" role="radiogroup" aria-label="Delivery address">
                  {addresses.data.map((address) => {
                    const isSelected = String(addressId || addresses.data?.find((item) => item.is_default)?.id || "") === String(address.id);
                    return <label key={address.id} className={`group relative block cursor-pointer rounded-2xl border bg-white p-4 transition ${isSelected ? "border-[#079447] shadow-[0_8px_20px_rgba(7,148,71,0.12)]" : "border-gray-200 hover:border-emerald-300"}`}>
                      <input type="radio" name="delivery-address" value={address.id} checked={isSelected} onChange={(event) => setAddressId(event.target.value)} className="sr-only" />
                      <span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-[#079447] bg-[#079447] text-white" : "border-gray-300 bg-white"}`}>{isSelected && <CheckCircle2 size={14} aria-hidden="true" />}</span>
                      <div className="pr-7"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-gray-900">{address.full_name}</p>{address.is_default && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#057a3a]">Default</span>}</div><p className="mt-1.5 text-xs leading-5 text-gray-600">{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}<br />{address.city}, {address.state} {address.postal_code}</p>{address.phone && <p className="mt-1 text-xs text-gray-500">{address.phone}</p>}</div>
                      <Link to="/profile" onClick={(event) => event.stopPropagation()} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#079447] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]"><Pencil size={12} /> Edit</Link>
                    </label>;
                  })}
                  <Link to="/profile" className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 px-3 py-3 text-xs font-semibold text-[#079447] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]"><Plus size={15} /> Add another address</Link>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-5 text-center"><p className="text-sm font-semibold text-gray-800">No delivery address saved</p><p className="mt-1 text-xs leading-5 text-gray-500">Add an address to continue with checkout.</p><Link to="/profile" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#079447] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#057a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447]"><Plus size={14} /> Add delivery address</Link></div>
              )}
            </section>
            <section className="mt-6 border-t border-emerald-100 pt-5" aria-labelledby="payment-method-heading">
              <h3 id="payment-method-heading" className="text-sm font-semibold text-gray-900">Payment method</h3>
              <div className="mt-3 space-y-2" role="radiogroup" aria-label="Payment method">
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${paymentMethod === "razorpay" ? "border-[#079447] bg-white" : "border-transparent bg-white/60"}`}><input type="radio" name="payment-method" value="razorpay" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} className="accent-[#079447]" /><CreditCard size={17} className="text-[#079447]" aria-hidden="true" /><span className="text-sm font-medium text-gray-800">Pay securely with Razorpay</span></label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${paymentMethod === "cod" ? "border-[#079447] bg-white" : "border-transparent bg-white/60"}`}><input type="radio" name="payment-method" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="accent-[#079447]" /><Banknote size={17} className="text-[#079447]" aria-hidden="true" /><span className="text-sm font-medium text-gray-800">Cash on delivery</span></label>
              </div>
            </section>
            <button
              onClick={checkout}
              disabled={checkingOut || !addresses.data?.length}
              className="mt-5 w-full rounded-xl bg-[#079447] px-5 py-3 font-semibold text-white hover:bg-[#057a3a] disabled:bg-gray-300"
            >
              {checkingOut ? "Processing…" : paymentMethod === "razorpay" ? "Pay with Razorpay" : "Place order"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
};

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay="checkout"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay could not be loaded.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "checkout";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Razorpay could not be loaded."));
    document.body.appendChild(script);
  });
}

function openRazorpayCheckout(paymentOrder) {
  return new Promise((resolve, reject) => {
    const orderId = paymentOrder.razorpay_order_id || paymentOrder.provider_order_id;
    if (!window.Razorpay || !paymentOrder.key_id || !orderId || !paymentOrder.amount) {
      reject(new Error("The payment order returned by the server is incomplete."));
      return;
    }
    const checkout = new window.Razorpay({
      key: paymentOrder.key_id,
      amount: Number(paymentOrder.amount),
      currency: paymentOrder.currency || "INR",
      name: "SNA Sundaram",
      description: "Order payment",
      order_id: orderId,
      theme: { color: "#079447" },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error("Payment was cancelled.")) },
    });
    checkout.on("payment.failed", (event) => reject(new Error(event.error?.description || "Payment failed.")));
    checkout.open();
  });
}

const Summary = ({ label, value, strong }) => (
  <div
    className={`flex justify-between gap-4 ${strong ? "text-lg font-bold text-gray-900" : "text-gray-600"}`}
  >
    <span>{label}</span>
    <span>{formatCurrency(value)}</span>
  </div>
);

export default Cart;
