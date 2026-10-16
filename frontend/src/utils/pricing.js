import formatCurrency from "./formatCurrency.js";

const toNumber = (value) => {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function getPricingDisplay(product = {}) {
  const regular = toNumber(product?.price);
  const sale = toNumber(product?.sale_price);
  const effective = toNumber(product?.effective_price);

  const hasValidRegular = regular != null;
  const hasValidSale = sale != null;
  const hasDiscount = hasValidRegular && hasValidSale && sale < regular;
  const saleAboveRegular = hasValidRegular && hasValidSale && sale > regular;

  let currentPrice;
  if (hasDiscount) {
    currentPrice = sale;
  } else if (saleAboveRegular) {
    currentPrice = effective ?? regular;
  } else if (hasValidSale && !hasValidRegular) {
    currentPrice = sale;
  } else {
    currentPrice = regular ?? sale ?? effective ?? 0;
  }

  const originalPrice = hasDiscount ? regular : null;

  return {
    currentPrice,
    originalPrice,
    hasDiscount,
    currentPriceLabel: formatCurrency(currentPrice),
    originalPriceLabel: originalPrice != null ? formatCurrency(originalPrice) : null,
  };
}

export function getVariantPricingDisplay(variant = {}, product = {}) {
  return getPricingDisplay({
    price: variant?.price ?? product?.price,
    sale_price: variant?.sale_price ?? product?.sale_price,
    effective_price: variant?.effective_price ?? product?.effective_price,
  });
}
