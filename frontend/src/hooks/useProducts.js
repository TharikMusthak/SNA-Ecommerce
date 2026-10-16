import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@config/constants";
import {
  fetchProduct,
  fetchRelatedProducts,
  listFeaturedProducts,
  listProducts,
} from "@services/product.service";

export function useProducts(params = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, params],
    queryFn: () => listProducts(params),
  });
}

export function useFeaturedProducts(params = { limit: 4 }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.featuredProducts, params],
    queryFn: () => listFeaturedProducts(params),
  });
}

export function useProduct(identifier) {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, "detail", identifier],
    queryFn: () => fetchProduct(identifier),
    enabled: Boolean(identifier),
  });
}

export function useRelatedProducts(productId) {
  return useQuery({
    queryKey: [...QUERY_KEYS.products, productId, "related"],
    queryFn: () => fetchRelatedProducts(productId),
    enabled: Boolean(productId),
  });
}
