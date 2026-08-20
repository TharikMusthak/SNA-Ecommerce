import { createBrowserRouter } from "react-router-dom";

import MainLayout from "@layouts/MainLayout/MainLayout";
import AuthLayout from "@layouts/AuthLayout/AuthLayout";
// import AdminLayout from "@layouts/AdminLayout/AdminLayout";

import Home from "@pages/Home/Home";
import Product from "@pages/Product/Product";
import Cart from "@pages/Cart/Cart";
import OurStory from "@pages/OurStory/OurStory";
import ContactUs from "@pages/ContactUs/ContactUs";
import TermsAndConditions from "@pages/TermsAndConditions/TermsAndConditions";
import PrivacyPolicy from "@pages/PrivacyPolicy/PrivacyPolicy";

import Login from "@pages/Login/Login";
import Register from "@pages/Register/Register";

import Profile from "@pages/Profile/Profile";
import Wishlist from "@pages/Wishlist/Wishlist";
// import Dashboard from "@pages/Admin/Dashboard";

import ProtectedRoute from "@app/ProtectedRoute";
import GuestRoute from "@app/GuestRoute";

import NotFound from "@pages/NotFound/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },

      {
        path: "products",
        element: <Product />,
      },
      {
        path: "products/:identifier",
        element: <Product />,
      },
      {
        path: "ourstory",
        element: <OurStory />,
      },
      {
        path: "contactus",
        element: <ContactUs />,
      },
      {
        path: "terms-and-conditions",
        element: <TermsAndConditions />,
      },
      {
        path: "privacy-policy",
        element: <PrivacyPolicy />,
      },

      // Protected Routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "cart",
            element: <Cart />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "wishlist",
            element: <Wishlist />,
          },
          // {
          //   path: "orders",
          //   element: <Orders />,
          // },
          // {
          //   path: "checkout",
          //   element: <Checkout />,
          // },
        ],
      },
    ],
  },

  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            path: "login",
            element: <Login />,
          },
          {
            path: "register",
            element: <Register />,
          },
        ],
      },
    ],
  },

  // {
  //   path: "/admin",
  //   element: <AdminRoute />,
  //   children: [
  //     {
  //       element: <AdminLayout />,
  //       children: [
  //         {
  //           index: true,
  //           element: <Dashboard />,
  //         },
  //       ],
  //     },
  //   ],
  // },

  {
    path: "*",
    element: <NotFound />,
  },
]);
