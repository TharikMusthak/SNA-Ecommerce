import {
  getFeaturedProducts,
  getProduct,
  getProducts,
  getRelatedProducts,
} from "@api/product.api";

const collection = (response) => ({
  items: response.data.data || [],
  pagination: response.data.pagination || null,
});

export const listProducts = async (params) =>
  collection(await getProducts(params));
export const listFeaturedProducts = async (params) =>
  collection(await getFeaturedProducts(params));
export const fetchProduct = async (identifier) =>
  (await getProduct(identifier)).data.data;
export const fetchRelatedProducts = async (productId) =>
  (await getRelatedProducts(productId)).data.data || [];
