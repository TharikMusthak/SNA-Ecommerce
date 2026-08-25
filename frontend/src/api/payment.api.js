import api from "./axios";

export const createRazorpayPaymentOrder = (paymentId) =>
  api.post("/payments/create-order", { payment_id: paymentId });

export const verifyRazorpayPayment = (paymentId, checkoutResponse) =>
  api.post("/payments/verify", {
    payment_id: paymentId,
    razorpay_payment_id: checkoutResponse.razorpay_payment_id,
    razorpay_order_id: checkoutResponse.razorpay_order_id,
    razorpay_signature: checkoutResponse.razorpay_signature,
  });