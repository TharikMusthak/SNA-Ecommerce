import assert from "node:assert/strict";
import { getPricingDisplay, getVariantPricingDisplay } from "./pricing.js";

const plain = (value) => value.replace(/\s/g, "");

const cases = [
  {
    name: "lower sale price shows struck-through regular price",
    input: { price: 1000, sale_price: 800 },
    expected: { current: "₹800.00", original: "₹1,000.00", hasDiscount: true },
  },
  {
    name: "missing sale price shows only regular price",
    input: { price: 1000, sale_price: null },
    expected: { current: "₹1,000.00", original: null, hasDiscount: false },
  },
  {
    name: "equal prices show only one active price",
    input: { price: 1000, sale_price: 1000 },
    expected: { current: "₹1,000.00", original: null, hasDiscount: false },
  },
  {
    name: "sale price greater than regular price does not create a discount",
    input: { price: 1000, sale_price: 1200 },
    expected: { current: "₹1,000.00", original: null, hasDiscount: false },
  },
  {
    name: "null values do not break rendering",
    input: { price: null, sale_price: undefined },
    expected: { current: "₹0.00", original: null, hasDiscount: false },
  },
  {
    name: "empty sale price is treated as missing",
    input: { price: 1000, sale_price: "" },
    expected: { current: "₹1,000.00", original: null, hasDiscount: false },
  },
  {
    name: "whitespace sale price is treated as missing",
    input: { price: 1000, sale_price: "   " },
    expected: { current: "₹1,000.00", original: null, hasDiscount: false },
  },
  {
    name: "sale-only product shows the sale amount without a strike-through",
    input: { price: null, sale_price: 800 },
    expected: { current: "₹800.00", original: null, hasDiscount: false },
  },
];

for (const testCase of cases) {
  const result = getPricingDisplay(testCase.input);
  assert.equal(result.hasDiscount, testCase.expected.hasDiscount, testCase.name);
  assert.equal(plain(result.currentPriceLabel), plain(testCase.expected.current), testCase.name);
  assert.equal(
    result.originalPriceLabel ? plain(result.originalPriceLabel) : null,
    testCase.expected.original ? plain(testCase.expected.original) : null,
    testCase.name,
  );
}

const variantDiscount = getVariantPricingDisplay(
  { price: 1000, sale_price: 800 },
  { price: 2000, sale_price: 500 },
);
assert.equal(variantDiscount.hasDiscount, true);
assert.equal(plain(variantDiscount.currentPriceLabel), "₹800.00");
assert.equal(plain(variantDiscount.originalPriceLabel), "₹1,000.00");

const variantFallsBackToProduct = getVariantPricingDisplay(
  {},
  { price: 1000, sale_price: 800 },
);
assert.equal(variantFallsBackToProduct.hasDiscount, true);
assert.equal(plain(variantFallsBackToProduct.currentPriceLabel), "₹800.00");

const variantDoesNotTreatEffectiveAsSale = getVariantPricingDisplay(
  { price: 1000, effective_price: 800 },
  {},
);
assert.equal(variantDoesNotTreatEffectiveAsSale.hasDiscount, false);
assert.equal(plain(variantDoesNotTreatEffectiveAsSale.currentPriceLabel), "₹1,000.00");
assert.equal(variantDoesNotTreatEffectiveAsSale.originalPriceLabel, null);

const higherSaleUsesEffectiveWhenPresent = getPricingDisplay({
  price: 1000,
  sale_price: 1200,
  effective_price: 1000,
});
assert.equal(higherSaleUsesEffectiveWhenPresent.hasDiscount, false);
assert.equal(plain(higherSaleUsesEffectiveWhenPresent.currentPriceLabel), "₹1,000.00");
assert.equal(higherSaleUsesEffectiveWhenPresent.originalPriceLabel, null);

 