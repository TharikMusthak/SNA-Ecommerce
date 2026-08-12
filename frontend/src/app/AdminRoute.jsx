import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
 import Loaders from "@components/loaders/Loaders";

const AdminRoute = () => {
  const { loading, user } = useAuth();

if (loading) {
   <Loaders/>
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;