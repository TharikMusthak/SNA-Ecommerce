import { Outlet } from "react-router-dom";

import AuthModal from "@components/modals/AuthModal";
import Loaders from "@components/loaders/Loaders";
import { useAuth } from "@context/AuthProvider";

const ProtectedRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Loaders />;
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
