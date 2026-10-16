import { getPricingDisplay, getVariantPricingDisplay } from "@utils/helpers";

const ProductPrice = ({
  product,
  variant,
  currentClassName,
  originalClassName,
}) => {
  const pricing = variant
    ? getVariantPricingDisplay(variant, product)
    : getPricingDisplay(product);

  return (
    <>
      <span className={currentClassName}>{pricing.currentPriceLabel}</span>
      {pricing.hasDiscount && pricing.originalPriceLabel ? (
        <del className={originalClassName}>{pricing.originalPriceLabel}</del>
      ) : null}
    </>
  );
};

export default ProductPrice;
