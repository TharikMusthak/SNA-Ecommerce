import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const AdminRoute = () => {
  const { loading, user } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;