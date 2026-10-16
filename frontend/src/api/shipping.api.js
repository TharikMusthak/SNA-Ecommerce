import api from "./axios";
export const getShippingQuote = (payload) => api.post("/shipping/quote", payload);
