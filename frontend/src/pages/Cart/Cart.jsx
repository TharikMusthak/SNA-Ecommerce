import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Tag,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import fallbackImage from "@assets/images/product1.png";
import { apiErrorMessage } from "@api/axios";
import { createAddress, getAddresses } from "@api/address.api";
import { createOrder } from "@api/order.api";
import { createRazorpayPaymentOrder, verifyRazorpayPayment } from "@api/payment.api";
import { getShippingQuote } from "@api/shipping.api";
import { addToCart, clearCartCoupon } from "@services/cart.service";
import Spinner from "@components/ui/Spinner/Spinner";
import AddressModal from "@components/modals/AddressModal";
import { QUERY_KEYS } from "@config/constants";
import { useCart } from "@hooks/useCart";
import formatCurrency from "@utils/formatCurrency";
import { assetUrl } from "@utils/helpers";

const USER_COUPON_STORAGE_KEY = "sna_user_applied_coupon";

function getDeliveryLabel(days) {
  if (!days) return null;
  const date = new Date();
  date.setDate(date.getDate() + Number(days)+2);
  const day = date.toLocaleDateString("en-IN", { weekday: "short" });
  const month = date.toLocaleDateString("en-IN", { month: "short" });
  const num = date.getDate();
  return `Delivery by ${month} ${num}, ${day}`;
}

const Cart = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, isLoading, addItem, updateItem, removeItem, clear, applyCoupon, removeCoupon } = useCart();

  const [addressId, setAddressId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingError, setShippingError] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [couponInput, setCouponInput] = useState("");

  // ─── Addresses ────────────────────────────────────────────────────────────
  const addresses = useQuery({
    queryKey: QUERY_KEYS.addresses,
    queryFn: async () => {
      const savedAddresses = (await getAddresses()).data.data || [];
      return savedAddresses.map((address) => ({
        ...address,
        is_default: Number(address.is_default) === 1,
      }));
    },
    staleTime: 60_000, // addresses rarely change — cache for 1 min
  });

  const selectedAddressId = useMemo(
    () => addressId || addresses.data?.find((item) => item.is_default)?.id || "",
    [addressId, addresses.data],
  );

  const selectedAddress = useMemo(
    () => addresses.data?.find((a) => String(a.id) === String(selectedAddressId)),
    [addresses.data, selectedAddressId],
  );

  // ─── Shipping quote ────────────────────────────────────────────────────────
  // Stable fingerprint: only recomputes when item ids/quantities/prices actually change
  const cartFingerprint = useMemo(
    () =>
      cart.items
        .filter((i) => !i.__optimisticCartItem) // skip optimistic items — they have no real price
        .map((i) => `${i.product_id}:${i.variant_id ?? ""}:${i.quantity}:${i.unit_price}`)
        .join("|"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart.items],
  );

  // ─── Coupon state ──────────────────────────────────────────────────────────
  const rawCouponCode = useMemo(
    () =>
      cart.coupon_code ||
      cart.coupon ||
      cart.applied_coupon ||
      cart.summary?.coupon_code ||
      cart.summary?.coupon,
    [cart.coupon_code, cart.coupon, cart.applied_coupon, cart.summary],
  );

  // Computed once per render — localStorage read is synchronous and cheap
  const appliedCouponCode = useMemo(() => {
    const stored = localStorage.getItem(USER_COUPON_STORAGE_KEY);
    return rawCouponCode && stored && String(rawCouponCode).trim() === String(stored).trim()
      ? rawCouponCode
      : null;
  }, [rawCouponCode]);

  const isMutating = updateItem.isPending || removeItem.isPending || addItem.isPending;

  useEffect(() => {
    // Skip shipping recalc while a mutation is in-flight to avoid thrashing
    if (!selectedAddressId || !cart.items.length || isMutating) return;

    let active = true;
    setShippingLoading(true);
    setShippingError("");

    getShippingQuote({
      address_id: Number(selectedAddressId),
      payment_method: paymentMethod,
      coupon_code: appliedCouponCode || undefined,
    })
      .then((response) => {
        if (active) setShippingQuote(response.data.data || response.data);
      })
      .catch((error) => {
        if (active) {
          setShippingError(apiErrorMessage(error, "Shipping rate could not be calculated"));
        }
      })
      .finally(() => {
        if (active) setShippingLoading(false);
      });

    return () => { active = false; };
  }, [selectedAddressId, paymentMethod, cartFingerprint, appliedCouponCode, isMutating]);

  // ─── Derived summary values (Instant update on cart/coupon changes) ───────
  const displaySummary = useMemo(() => {
    const baseSummary = cart.summary || {};
    if (shippingQuote?.summary) {
      const shippingCost = shippingQuote.summary.shipping ?? 0;
      const subtotal = baseSummary.subtotal ?? shippingQuote.summary.subtotal ?? 0;
      const discount = baseSummary.discount ?? shippingQuote.summary.discount ?? 0;
      const tax = baseSummary.tax ?? shippingQuote.summary.tax ?? 0;
      const total = Math.max(0, subtotal + tax + shippingCost - discount);
      return {
        ...baseSummary,
        ...shippingQuote.summary,
        subtotal,
        discount,
        tax,
        shipping: shippingCost,
        total,
      };
    }
    return baseSummary;
  }, [cart.summary, shippingQuote]);

  const { itemCount, subtotal, discount, tax, shipping, total, savings, isFreeShipping } = useMemo(() => {
    const _subtotal  = displaySummary?.subtotal ?? cart.items.reduce((s, i) => s + Number(i.line_total || i.unit_price * i.quantity), 0);
    const _discount  = displaySummary?.discount ?? 0;
    const _tax       = displaySummary?.tax ?? 0;
    const _shipping  = displaySummary?.shipping ?? 0;
    const _total     = displaySummary?.total ?? Math.max(0, _subtotal + _tax + _shipping - _discount);
    return {
      itemCount:      cart.items.reduce((s, i) => s + i.quantity, 0),
      subtotal:       _subtotal,
      discount:       _discount,
      tax:            _tax,
      shipping:       _shipping,
      total:          _total,
      savings:        _discount,
      isFreeShipping: shippingQuote?.free_shipping || _shipping === 0,
    };
  }, [displaySummary, cart.items, shippingQuote]);

  // ─── Page loading guard (only for initial load) ───────────────────────────
  const pageLoading =
    isLoading ||
    addItem.isPending ||
    addresses.isLoading;

  // ─── Auto-remove stale / invalid coupons ──────────────────────────────────
  useEffect(() => {
    const userAppliedCode = localStorage.getItem(USER_COUPON_STORAGE_KEY);
    if (rawCouponCode && !userAppliedCode) {
      removeCoupon.mutateAsync().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .then(() => { toast.error("Invalid coupon removed automatically."); })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.coupon_invalid, cart.is_coupon_valid, cart.summary?.is_coupon_valid]);

  // ─── Stable callbacks ──────────────────────────────────────────────────────
  const run = useCallback(async (operation, successMessage) => {
    try {
      await operation();
      if (successMessage) toast.success(successMessage);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Cart could not be updated"));
    }
  }, []);

  // Clears the coupon API + localStorage — only called from Cart page actions
  const clearCouponIfApplied = useCallback(async () => {
    const hasCoupon = !!(
      cart.coupon_code ||
      cart.coupon ||
      cart.applied_coupon ||
      cart.summary?.coupon_code ||
      cart.summary?.coupon
    );
    if (!hasCoupon) return;
    try {
      localStorage.removeItem(USER_COUPON_STORAGE_KEY);
      await clearCartCoupon();
    } catch {
      // ignore — coupon clear failure should not block remove/clear
    }
  }, [cart.coupon_code, cart.coupon, cart.applied_coupon, cart.summary]);

  const handleRemoveCoupon = useCallback(async () => {
    try {
      localStorage.removeItem(USER_COUPON_STORAGE_KEY);
      setShippingQuote(null);
      await removeCoupon.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart });
      toast.success("Coupon removed");
      setCouponInput("");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not remove coupon"));
    }
  }, [removeCoupon.mutateAsync, queryClient]);

  const submitCoupon = useCallback(async (event) => {
    event.preventDefault();
    const code = (couponInput || new FormData(event.currentTarget).get("code") || "")
      .toString()
      .trim();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }
    try {
      setShippingQuote(null);
      const res = await applyCoupon.mutateAsync(code);
      if (res && (res.valid === false || res.is_valid === false)) {
        localStorage.removeItem(USER_COUPON_STORAGE_KEY);
        await removeCoupon.mutateAsync();
        toast.error("Invalid coupon code. Removed automatically.");
        setCouponInput("");
        return;
      }
      localStorage.setItem(USER_COUPON_STORAGE_KEY, code);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart });
      toast.success("Coupon applied");
      setCouponInput("");
    } catch (error) {
      try {
        localStorage.removeItem(USER_COUPON_STORAGE_KEY);
        setShippingQuote(null);
        await removeCoupon.mutateAsync();
      } catch {
        // ignore
      }
      toast.error(apiErrorMessage(error, "Invalid coupon code. Removed automatically."));
      setCouponInput("");
    }
  }, [couponInput, applyCoupon.mutateAsync, removeCoupon.mutateAsync, queryClient]);

  // ─── Checkout ──────────────────────────────────────────────────────────────
  const checkout = useCallback(async () => {
    if (!addresses.data?.length) {
      toast.error("Please add a delivery address to place your order");
      setShowAddAddressModal(true);
      return;
    }
    if (!selectedAddressId) {
      toast.error("Please select a delivery address to place your order");
      setShowAddressPicker(true);
      const el = document.getElementById("delivery-address-banner");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!shippingQuote?.quote_id) {
      toast.error(shippingError || "Wait for the shipping rate calculation to complete");
      const el = document.getElementById("delivery-address-banner");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Save cart items snapshot in case Razorpay payment is cancelled or fails
    const cartSnapshot = cart.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      variant_id: item.variant_id || null,
    }));

    let orderCreated = false;

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
      orderCreated = true;

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
      // If order was created on backend but Razorpay payment was cancelled or failed, restore the cart!
      if (orderCreated && paymentMethod === "razorpay" && cartSnapshot.length > 0) {
        try {
          await Promise.all(
            cartSnapshot.map((item) =>
              addToCart(item.product_id, item.quantity, item.variant_id)
            )
          );
        } catch (restoreError) {
          console.error("Could not restore cart items after cancelled payment:", restoreError);
        } finally {
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cart });
        }
      }
      toast.error(apiErrorMessage(error, "Order could not be placed"));
    } finally {
      setCheckingOut(false);
    }
  }, [addresses.data, selectedAddressId, shippingQuote, shippingError, paymentMethod, cart.items, navigate, queryClient]);

  // ─── Early returns ─────────────────────────────────────────────────────────
  if (pageLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );

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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-[70vh] bg-[#f1f3f6]">
      <div className="mx-auto max-w-[1240px] px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex flex-col gap-0 lg:flex-row lg:items-start lg:gap-4">

          {/*  LEFT COLUMN  */}
          <div className="min-w-0 flex-1">

            {/*  Delivery Address Banner  */}
            <div id="delivery-address-banner" className={`rounded-xl bg-white shadow-sm transition-all duration-200 ${!selectedAddress ? "ring-2 ring-amber-400/80 bg-amber-50/10" : "ring-1 ring-black/[0.03]"}`}>
              <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <MapPin size={20} className={`shrink-0 ${!selectedAddress ? "text-amber-600 animate-pulse" : "text-[#079447]"}`} />
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
                    ) : !addresses.data?.length ? (
                      <div>
                        <span className="text-sm font-bold text-amber-800">
                          No delivery address added
                        </span>
                        <p className="text-xs text-amber-700">Please add a delivery address to complete your order</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm font-bold text-amber-800">
                          No delivery address selected
                        </span>
                        <p className="text-xs text-amber-700">Select an address below to proceed</p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  id="cart-change-address-btn"
                  onClick={() => setShowAddressPicker((v) => !v)}
                  className={`ml-4 shrink-0 rounded-xl px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${!selectedAddress ? "border border-amber-600 bg-amber-600 text-white shadow-xs hover:bg-amber-700" : "border border-[#079447] text-[#079447] hover:bg-emerald-50"}`}
                >
                  {selectedAddress ? "Change" : addresses.data?.length ? "Select Address" : "Add Address"}
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
                      <div className="mt-2 flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddAddressModal(true)}
                          className="text-xs font-bold text-[#079447] hover:underline"
                        >
                          + Quick Add Address
                        </button>
                        <Link
                          to="/profile"
                          className="text-xs font-semibold text-gray-500 underline-offset-2 hover:underline"
                        >
                          Manage addresses
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm font-medium text-gray-600">No saved addresses found.</p>
                      <button
                        type="button"
                        onClick={() => setShowAddAddressModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#079447] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#057a3a]"
                      >
                        + Add Delivery Address Now
                      </button>
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
                  <CartItem
                    key={item.id}
                    item={item}
                    shippingLoading={shippingLoading}
                    shippingQuote={shippingQuote}
                    updateItem={updateItem}
                    removeItem={removeItem}
                    run={run}
                    clearCouponIfApplied={clearCouponIfApplied}
                  />
                ))}
              </div>
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
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-[#388e3c]">
                        <span>Discount</span>
                        <span className="font-semibold">- {formatCurrency(discount)}</span>
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

              {/* Address & Shipping Warnings */}
              {!addresses.data?.length ? (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-900">Delivery address required</p>
                      <p className="mt-0.5 leading-relaxed text-amber-700">
                        You have not added a delivery address. Please add an address to place your order.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddAddressModal(true)}
                        className="mt-2 inline-flex items-center gap-1 font-bold text-[#079447] underline underline-offset-2 hover:text-[#057a3a]"
                      >
                        + Add Delivery Address Now
                      </button>
                    </div>
                  </div>
                </div>
              ) : !selectedAddressId ? (
                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-900">No delivery address selected</p>
                      <p className="mt-0.5 leading-relaxed text-amber-700">
                        Please select a delivery address from the list above.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressPicker(true);
                          document.getElementById("delivery-address-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="mt-2 inline-flex items-center gap-1 font-bold text-[#079447] underline underline-offset-2 hover:text-[#057a3a]"
                      >
                        Select Delivery Address
                      </button>
                    </div>
                  </div>
                </div>
              ) : shippingError ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-red-900">Shipping calculation error</p>
                      <p className="mt-0.5 text-red-700">{shippingError}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Place Order CTA */}
              <div className="mt-3">
                <button
                  id="cart-place-order-btn"
                  onClick={checkout}
                  disabled={checkingOut || (shippingLoading && Boolean(selectedAddressId))}
                  className={`w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition ${!selectedAddress ? "bg-amber-600 hover:bg-amber-700 hover:shadow-lg" : "bg-[#079447] hover:bg-[#057a3a] hover:shadow-lg"} disabled:cursor-not-allowed disabled:bg-gray-300`}
                >
                  {checkingOut
                    ? "Processing..."
                    : !selectedAddress
                    ? "Add / Select Address to Order"
                    : "Place Order"}
                </button>
              </div>

            </div>
          </aside>
          {/* END RIGHT COLUMN */}

        </div>
      </div>

      {/* Quick Add Address Modal */}
      <AddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onSuccess={(newId) => {
          if (newId) setAddressId(String(newId));
        }}
      />
    </main>
  );
};

// ─── CartItem — memoized to prevent re-renders when sibling items change ──────
const CartItem = memo(function CartItem({
  item,
  shippingLoading,
  shippingQuote,
  updateItem,
  removeItem,
  run,
  clearCouponIfApplied,
}) {
  const handleRemove = useCallback(async () => {
    await clearCouponIfApplied();
    run(() => removeItem.mutateAsync(item.id), "Item removed");
  }, [clearCouponIfApplied, run, removeItem, item.id]);

  return (
    <div className="px-4 py-5 sm:px-6">
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
              loading="lazy"
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

          {/* Delivery date */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {shippingLoading ? (
              <span className="text-gray-400">Calculating delivery…</span>
            ) : shippingQuote ? (
              <span className="font-semibold text-[#388e3c]">
                {getDeliveryLabel(shippingQuote.courier?.estimated_delivery_days) || "Delivery date TBD"}
              </span>
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
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});



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
