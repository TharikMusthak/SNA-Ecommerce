import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@config/constants";
import { fetchBanners } from "@services/banner.service";

export function useBanners(params = {}) {
  return useQuery({
    queryKey: [...(QUERY_KEYS.banners || ["banners"]), params],
    queryFn: () => fetchBanners(params),
    staleTime: 5 * 60 * 1000,
  });
}
