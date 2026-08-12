import { Outlet } from "react-router-dom";

import Logo from "@assets/images/Navbar/snaNavbarLogo.svg";
import AuthModal from "@components/modals/AuthModal";
import { useAuth } from "@context/AuthProvider";
 import Loaders from "@components/loaders/Loaders";

const ProtectedRoute = () => {
  const { loading, isAuthenticated } = useAuth();

if (loading) {
   <Loaders/>
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
