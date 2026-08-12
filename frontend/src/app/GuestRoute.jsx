import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";
 import Loaders from "@components/loaders/Loaders";

const GuestRoute = () => {
  const { loading, isAuthenticated } = useAuth();

if (loading) {
   <Loaders/>
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

export default GuestRoute;