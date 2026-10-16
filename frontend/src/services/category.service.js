import { getCategories } from "@api/category.api";

export const listCategories = async (params) => {
  const response = await getCategories(params);
  return {
    items: response.data.data || [],
    pagination: response.data.pagination || null,
  };
};
