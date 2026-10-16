import { Navigate, Outlet } from "react-router-dom";

import Loaders from "@components/loaders/Loaders";
import { useAuth } from "../context/AuthProvider";

const GuestRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Loaders />;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

export default GuestRoute;
