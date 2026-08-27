import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Tag,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import { getAddresses } from "@api/address.api";
import { createOrder } from "@api/order.api";
import { createRazorpayPaymentOrder, verifyRazorpayPayment } from "@api/payment.api";
import { getShippingQuote } from "@api/shipping.api";
import Spinner from "@components/ui/Spinner/Spinner";
import { QUERY_KEYS } from "@config/constants";
import { useCart } from "@hooks/useCart";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl } from "@utils/helpers";

 function getDeliveryLabel(days) {
  if (!days) return null;
  const date = new Date();
  date.setDate(date.getDate() + Number(days )); //+2 for add 2 days
  const day = date.toLocaleDateString("en-IN", { weekday: "short" });
  const month = date.toLocaleDateString("en-IN", { month: "short" });
  const num = date.getDate();
  return `Delivery by ${month} ${num}, ${day}`;
}

const Cart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, isLoading, updateItem, removeItem, clear, applyCoupon, removeCoupon } = useCart();
 
  const [addressId, setAddressId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingError, setShippingError] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [couponInput, setCouponInput] = useState("");

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

  const selectedAddressId =
    addressId || addresses.data?.find((item) => item.is_default)?.id || "";
  const selectedAddress = addresses.data?.find(
    (a) => String(a.id) === String(selectedAddressId)
  );

  const cartFingerprint = useMemo(
    () =>
      JSON.stringify({
        coupon: cart.coupon_code || null,
        items: cart.items.map((item) => [
          item.product_id,
          item.variant_id,
          item.quantity,
          item.unit_price,
        ]),
      }),
    [cart]
  );

  useEffect(() => {
    if (!selectedAddressId || !cart.items.length) return;
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setShippingLoading(true);
        setShippingError("");
        return getShippingQuote({
          address_id: Number(selectedAddressId),
          payment_method: paymentMethod,
        });
      })
      .then((response) => {
        if (active && response) setShippingQuote(response.data.data || response.data);
      })
      .catch((error) => {
        if (active) {
          setShippingQuote(null);
          setShippingError(apiErrorMessage(error, "Shipping rate could not be calculated"));
        }
      })
      .finally(() => {
        if (active) setShippingLoading(false);
      });
    return () => { active = false; };
  }, [selectedAddressId, paymentMethod, cartFingerprint, cart.items.length]);

  const displaySummary = shippingQuote?.summary || cart.summary;

  const pageLoading =
    isLoading ||
    addresses.isLoading ||
    (cart.items.length > 0 && !selectedAddressId && shippingLoading) ||
    (cart.items.length > 0 && !!selectedAddressId && shippingLoading && !shippingQuote && !shippingError);

  const run = async (operation, successMessage) => {
    try {
      await operation();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Cart could not be updated"));
    }
  };

  const USER_COUPON_STORAGE_KEY = "sna_user_applied_coupon";

  const handleRemoveCoupon = async () => {
    try {
      localStorage.removeItem(USER_COUPON_STORAGE_KEY);
      await removeCoupon.mutateAsync();
      toast.success("Coupon removed");
      setCouponInput("");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not remove coupon"));
    }
  };

  const submitCoupon = async (event) => {
    event.preventDefault();
    const code = (couponInput || new FormData(event.currentTarget).get("code") || "")
      .toString()
      .trim();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      const res = await applyCoupon.mutateAsync(code);
      if (res && (res.valid === false || res.is_valid === false)) {
        localStorage.removeItem(USER_COUPON_STORAGE_KEY);
        await removeCoupon.mutateAsync();
        toast.error("Invalid coupon code. Removed automatically.");
        setCouponInput("");
        return;
      }
      localStorage.setItem(USER_COUPON_STORAGE_KEY, code);
      toast.success("Coupon applied");
      setCouponInput("");
    } catch (error) {
      try {
        localStorage.removeItem(USER_COUPON_STORAGE_KEY);
        await removeCoupon.mutateAsync();
      } catch {
        // ignore
      }
      toast.error(apiErrorMessage(error, "Invalid coupon code. Removed automatically."));
      setCouponInput("");
    }
  };

  const rawCouponCode =
    cart.coupon_code ||
    cart.coupon ||
    cart.applied_coupon ||
    cart.summary?.coupon_code ||
    cart.summary?.coupon;

  useEffect(() => {
    const userAppliedCode = localStorage.getItem(USER_COUPON_STORAGE_KEY);
    if (rawCouponCode && !userAppliedCode) {
      removeCoupon.mutateAsync().catch(() => {});
    }
  }, [rawCouponCode]);

  useEffect(() => {
    if (
      cart.coupon_invalid ||
      cart.is_coupon_valid === false ||
      cart.summary?.is_coupon_valid === false
    ) {
      localStorage.removeItem(USER_COUPON_STORAGE_KEY);
      removeCoupon
        .mutateAsync()
        .then(() => {
          toast.error("Invalid coupon removed automatically.");
        })
        .catch(() => {});
    }
  }, [cart.coupon_invalid, cart.is_coupon_valid, cart.summary?.is_coupon_valid]);

  const checkout = async () => {
    if (!selectedAddressId) {
      toast.error("Select or add a delivery address");
      return;
    }
    if (!shippingQuote?.quote_id) {
      toast.error(shippingError || "Wait for the shipping rate to load");
      return;
    }
    try {
      setCheckingOut(true);
      const response = await createOrder(
        {
          address_id: Number(selectedAddressId),
          payment_method: paymentMethod,
          shipping_quote_id: shippingQuote.quote_id,
        },
        crypto.randomUUID()
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
          : `Order ${order.order_number} placed successfully`
      );
      navigate("/profile");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Order could not be placed"));
    } finally {
      setCheckingOut(false);
    }
  };

  if (pageLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );

  /*  Empty Cart  */
  if (cart.items.length === 0)
    return (
      <main className="min-h-[70vh] bg-[#f1f3f6]">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-center px-4 py-24 text-center h-[100vh]">
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-sm">
            <ShoppingCart size={56} className="text-[#079447]" strokeWidth={1.3} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Your cart is empty!</h2>
          <p className="mt-2 text-gray-500">Add items to it now.</p>
          <Link
            to="/products"
            className="mt-6 inline-flex rounded-xl bg-[#079447] px-10 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-[#057a3a]"
          >
            Shop Now
          </Link>
        </div>
      </main>
    );

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = displaySummary.subtotal ?? 0;
  const discount = displaySummary.discount ?? 0;
  const tax = displaySummary.tax ?? 0;
  const shipping = displaySummary.shipping ?? 0;
  const total = displaySummary.total ?? 0;
  const savings = discount;
  const isFreeShipping = shippingQuote?.free_shipping || shipping === 0;
  const storedUserCoupon = localStorage.getItem(USER_COUPON_STORAGE_KEY);
  const appliedCouponCode =
    rawCouponCode && storedUserCoupon && String(rawCouponCode).trim() === String(storedUserCoupon).trim()
      ? rawCouponCode
      : null;

  return (
    <main className="min-h-[70vh] bg-[#f1f3f6]">
      <div className="mx-auto max-w-[1240px] px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex flex-col gap-0 lg:flex-row lg:items-start lg:gap-4">

          {/*  LEFT COLUMN  */}
          <div className="min-w-0 flex-1">

            {/*  Delivery Address Banner  */}
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/[0.03]">
              <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <MapPin size={20} className="shrink-0 text-[#079447]" />
                  <div className="min-w-0">
                    {selectedAddress ? (
                      <>
                        <span className="text-sm font-semibold text-gray-800">
                          Deliver to:{" "}
                          <span className="font-bold text-gray-900">{selectedAddress.full_name}</span>,{" "}
                          <span className="font-bold text-gray-900">{selectedAddress.postal_code}</span>
                        </span>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {selectedAddress.address_line_1}, {selectedAddress.city},{" "}
                          {selectedAddress.state}
                        </p>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-gray-500">
                        No delivery address selected
                      </span>
                    )}
                  </div>
                </div>
                <button
                  id="cart-change-address-btn"
                  onClick={() => setShowAddressPicker((v) => !v)}
                  className="ml-4 shrink-0 rounded-xl border border-[#079447] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#079447] transition hover:bg-emerald-50"
                >
                  {selectedAddress ? "Change" : "Add Address"}
                  <ChevronDown
                    size={12}
                    className={`ml-1 inline-block transition-transform ${showAddressPicker ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {/* Address Picker Dropdown */}
              {showAddressPicker && (
                <div className="border-t border-gray-100 px-4 pb-4 sm:px-6">
                  {addresses.isLoading ? (
                    <p className="py-4 text-center text-sm text-gray-400">Loading addresses</p>
                  ) : addresses.data?.length ? (
                    <div className="mt-3 space-y-2">
                      {addresses.data.map((addr) => {
                        const isSel = String(selectedAddressId) === String(addr.id);
                        return (
                          <label
                            key={addr.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isSel ? "border-[#079447] bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                          >
                            <input
                              type="radio"
                              name="delivery-address"
                              value={addr.id}
                              checked={isSel}
                              onChange={(e) => {
                                setAddressId(e.target.value);
                                setShowAddressPicker(false);
                              }}
                              className="mt-0.5 accent-[#079447]"
                            />
                            <div className="min-w-0 flex-1 text-sm">
                              <p className="font-semibold text-gray-900">
                                {addr.full_name}
                                {addr.is_default && (
                                  <span className="ml-2 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    DEFAULT
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 text-xs leading-5 text-gray-500">
                                {addr.address_line_1}
                                {addr.address_line_2 ? `, ${addr.address_line_2}` : ""},{" "}
                                {addr.city}, {addr.state}{", "}{addr.postal_code}
                              </p>
                              {addr.phone && (
                                <p className="mt-0.5 text-xs text-gray-400">{addr.phone}</p>
                              )}
                            </div>
                            {isSel && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#079447]" />}
                          </label>
                        );
                      })}
                      <Link
                        to="/profile"
                        className="mt-1 block text-center text-xs font-semibold text-[#079447] underline-offset-2 hover:underline"
                      >
                        + Manage addresses
                      </Link>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-gray-500">No saved addresses.</p>
                      <Link
                        to="/profile"
                        className="mt-2 inline-block text-sm font-semibold text-[#079447] hover:underline"
                      >
                        Add delivery address 
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* END Address Banner */}

            {/*  Cart Items  */}
            <div className="mt-3 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.03]">
              <div className="divide-y divide-gray-100">
                {cart.items.map((item) => (
                  <div key={item.id} className="px-4 py-5 sm:px-6">
                    <div className="flex gap-4 sm:gap-6">
                      {/* Product Image */}
                      <Link
                        to={`/products/${item.slug || item.product_id}`}
                        className="shrink-0"
                        id={`cart-item-img-${item.id}`}
                      >
                        <div className="h-[112px] w-[112px] overflow-hidden rounded-xl bg-[#f0f0f0] p-2 transition hover:opacity-90 sm:h-[130px] sm:w-[130px]">
                          <img
                            src={assetUrl(item.main_image, fallbackImage)}
                            alt={item.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/products/${item.slug || item.product_id}`}
                          className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-[#079447] sm:text-base"
                        >
                          {item.name}
                        </Link>

                        {/* Pricing row */}
                        <div className="mt-2 flex flex-wrap items-baseline gap-2">
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(item.line_total)}
                          </span>
                          <span className="text-sm text-gray-500">
                           {formatCurrency(item.unit_price)} each
                          </span>
                        </div>

                        {/* Shipping info — Delivery date */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                          {shippingLoading ? (
                            <span className="text-gray-400">Calculating delivery…</span>
                          ) : shippingQuote ? (
                            <>
                              <span className="font-semibold text-[#388e3c]">
                                {getDeliveryLabel(shippingQuote.courier?.estimated_delivery_days) || "Delivery date TBD"}
                              </span>

                              {/* Shipping price */}
                              {/* {!isFreeShipping && (
                                <span className="text-gray-400">· {formatCurrency(shipping)} delivery</span>
                              )}
                              {isFreeShipping && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-[#388e3c]">
                                  FREE
                                </span>
                              )} */}
                            </>
                          ) : (
                            <span className="text-gray-400">Select address for delivery info</span>
                          )}
                        </div>

                        {/* Quantity + Actions */}
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          {/* Quantity Control */}
                          <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                            <button
                              id={`cart-qty-dec-${item.id}`}
                              disabled={item.quantity <= 1 || updateItem.isPending}
                              onClick={() =>
                                run(() =>
                                  updateItem.mutateAsync({ itemId: item.id, quantity: item.quantity - 1 })
                                )
                              }
                              aria-label="Decrease quantity"
                              className="flex h-8 w-8 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="flex h-8 min-w-[36px] items-center justify-center border-x border-gray-200 px-2 text-sm font-semibold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              id={`cart-qty-inc-${item.id}`}
                              disabled={item.quantity >= item.available_stock || updateItem.isPending}
                              onClick={() =>
                                run(() =>
                                  updateItem.mutateAsync({ itemId: item.id, quantity: item.quantity + 1 })
                                )
                              }
                              aria-label="Increase quantity"
                              className="flex h-8 w-8 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Divider */}
                          <span className="hidden text-gray-300 sm:inline">|</span>

                          {/* Remove */}
                          <button
                            id={`cart-remove-${item.id}`}
                            onClick={() => run(() => removeItem.mutateAsync(item.id), "Item removed")}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={13} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Place Order Button  bottom of items (mobile friendly) */}
              
            </div>
            {/* END Cart Items */}
          </div>
          {/* END LEFT COLUMN */}

          {/*  RIGHT COLUMN  PRICE DETAILS  */}
          <aside className="w-full lg:w-[360px] lg:shrink-0">
            <div className="sticky top-20 space-y-0">

              {/* PRICE DETAILS Card */}
              <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/[0.03]">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                    Price Details
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Price ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                      <span className="font-medium">{formatCurrency(subtotal + discount)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-[#388e3c]">
                        <span>Discount</span>
                        <span className="font-semibold"> {formatCurrency(discount)}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Tax</span>
                        <span className="font-medium">{formatCurrency(tax)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Delivery Charges</span>
                      {shippingLoading ? (
                        <span className="text-xs text-gray-400">Calculating</span>
                      ) : isFreeShipping ? (
                        <span className="font-semibold text-[#388e3c]">FREE</span>
                      ) : (
                        <span className="font-medium">{formatCurrency(shipping)}</span>
                      )}
                    </div>
                  </div>

                  <div className="my-4 border-t border-dashed border-gray-200" />

                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">Total Payable</span>
                    <span className="text-base font-bold text-gray-900">
                      {formatCurrency(total)}
                    </span>
                  </div>

                  {savings > 0 && (
                    <div className="mt-4 rounded-xl bg-[#e8f5e9] px-3 py-2 text-sm font-semibold text-[#388e3c]">
                      You will save {formatCurrency(savings)} on this order
                    </div>
                  )}
                </div>
              </div>

              {/* Coupon */}
              <div className="mt-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Tag size={15} className="text-[#079447]" />
                    {appliedCouponCode ? "Coupon Applied" : "Apply Coupon"}
                  </div>
                </div>

                {appliedCouponCode ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="shrink-0 text-[#079447]" />
                        <span className="truncate text-xs font-bold uppercase tracking-wider text-emerald-900">
                          {appliedCouponCode !== "APPLIED" ? appliedCouponCode : "COUPON APPLIED"}
                        </span>
                      </div>
                      {discount > 0 && (
                        <p className="mt-1 text-xs font-semibold text-emerald-700">
                          Saved {formatCurrency(discount)} on this order
                        </p>
                      )}
                    </div>
                    <button
                      id="cart-remove-coupon-btn"
                      type="button"
                      disabled={removeCoupon.isPending}
                      onClick={handleRemoveCoupon}
                      className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 shadow-xs transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      {removeCoupon.isPending ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitCoupon} className="flex gap-2">
                    <input
                      name="code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Enter coupon code"
                      className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#079447] focus:ring-2 focus:ring-emerald-100"
                      maxLength={40}
                    />
                    <button
                      id="cart-apply-coupon"
                      type="submit"
                      disabled={applyCoupon.isPending || !couponInput.trim()}
                      className="shrink-0 rounded-xl border border-[#079447] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#079447] transition hover:bg-emerald-50 disabled:opacity-40"
                    >
                      {applyCoupon.isPending ? "Applying..." : "Apply"}
                    </button>
                  </form>
                )}
              </div>

              {/* Payment Method */}
              <div className="mt-3 rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/[0.03]">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
                  Payment Method
                </p>
                <div className="space-y-2">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${paymentMethod === "razorpay" ? "border-[#079447] bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={() => setPaymentMethod("razorpay")}
                      className="accent-[#079447]"
                    />
                    <CreditCard size={16} className="text-[#079447]" />
                    <span className="font-medium text-gray-800">Pay Now</span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${paymentMethod === "cod" ? "border-[#079447] bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="accent-[#079447]"
                    />
                    <Banknote size={16} className="text-[#079447]" />
                    <span className="font-medium text-gray-800">Cash on Delivery</span>
                  </label>
                </div>
              </div>

              {/* Place Order CTA */}
              <div className="mt-3">
                <button
                  id="cart-place-order-btn"
                  onClick={checkout}
                  disabled={checkingOut || shippingLoading || !shippingQuote?.quote_id || !addresses.data?.length}
                  className="w-full rounded-xl bg-[#079447] py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#057a3a] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {checkingOut
                    ? "Processing..."
                    : paymentMethod === "razorpay"
                    ? "Place Order"
                    : "Place Order"}
                </button>
              </div>

              {/* Trust Badge */}
               
            </div>
          </aside>
          {/* END RIGHT COLUMN */}

        </div>
      </div>
    </main>
  );
};

/*  Razorpay helpers  */
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

export default Cart;

