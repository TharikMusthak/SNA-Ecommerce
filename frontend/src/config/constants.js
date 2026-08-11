export const BASE_URL = "https://hinttechnologies.com/sna-api/api/v1";


 export const QUERY_KEYS = Object.freeze({
  session: ["session"],
  products: ["products"],
  featuredProducts: ["products", "featured"],
  categories: ["categories"],
  cart: ["cart"],
  wishlist: ["wishlist"],
  addresses: ["addresses"],
  orders: ["orders"],
  faqs: ["faqs"],
});

export const EMPTY_CART = Object.freeze({
  items: [],
  summary: {
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
    currency: "INR",
  },
});
