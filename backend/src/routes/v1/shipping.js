import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireCustomer } from "../../middleware/customerAuth.js";
import { parsePositiveId } from "../../security/validation.js";
import { createShippingQuote } from "../../services/shippingQuotes.js";
import { fail, ok } from "../../utils/apiResponse.js";

const router = Router();
router.use(requireCustomer);
router.post("/quote", asyncHandler(async (req, res) => {
  const addressId = parsePositiveId(req.body.address_id);
  const paymentMethod = String(req.body.payment_method || "razorpay").toLowerCase();
  if (!addressId || !["cod", "razorpay"].includes(paymentMethod)) return fail(res, 422, "A valid address and payment method are required");
  return ok(res, await createShippingQuote({ userId: req.user.id, addressId, paymentMethod }), "Shipping rate calculated");
}));
export default router;
