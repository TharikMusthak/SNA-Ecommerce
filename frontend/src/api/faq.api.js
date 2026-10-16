import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export const getFaqs = () => api.get(ENDPOINTS.faqs);
