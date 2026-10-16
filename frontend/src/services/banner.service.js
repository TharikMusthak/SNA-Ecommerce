import { getBanners } from "@api/banner.api";

export const fetchBanners = async (params = {}) => {
  try {
    const response = await getBanners(params);
    const data = response?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch (error) {
    console.error("Failed to fetch banners from API:", error);
    return [];
  }
};
