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
import ForgotPassword from "@pages/ForgotPassword/ForgotPassword";

import Profile from "@pages/Profile/Profile";
import Wishlist from "@pages/Wishlist/Wishlist";
import VerifyEmail from "@pages/VerifyEmail/VerifyEmail";
// import Dashboard from "@pages/Admin/Dashboard";

import ProtectedRoute from "@app/ProtectedRoute";
import GuestRoute from "@app/GuestRoute";

import NotFound from "@pages/NotFound/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    handle: { title: "SNA Sundaram" },
    children: [
      {
        index: true,
        element: <Home />,
        handle: { title: "Home" },
      },

      {
        path: "products",
        element: <Product />,
        handle: { title: "Products" },
      },
      {
        path: "products/:identifier",
        element: <Product />,
                handle: { title: "Products Details" },

       },
      {
        path: "ourstory",
        element: <OurStory />,
        handle: { title: "Our Story" },
      },
      {
        path: "contactus",
        element: <ContactUs />,
        handle: { title: "Contact Us" },
      },
      {
        path: "terms-and-conditions",
        element: <TermsAndConditions />,
        handle: { title: "Terms and Conditions" },
      },
      {
        path: "privacy-policy",
        element: <PrivacyPolicy />,
        handle: { title: "Privacy Policy" },
      },
      {
        path: "verify-email",
        element: <VerifyEmail />,
        handle: { title: "Verify Email" },
      },

      // Protected Routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "cart",
            element: <Cart />,
            handle: { title: "Cart" },
          },
          {
            path: "profile",
            element: <Profile />,
            handle: { title: "Profile" },
          },
          {
            path: "wishlist",
            element: <Wishlist />,
            handle: { title: "Wishlist" },
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
    handle: { title: "Account" },
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            path: "login",
            element: <Login />,
            handle: { title: "Login" },
          },
          {
            path: "register",
            element: <Register />,
            handle: { title: "Register" },
          },
          {
            path: "forgot-password",
            element: <ForgotPassword />,
            handle: { title: "Forgot Password" },
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
    handle: { title: "Page Not Found" },
  },
]);
