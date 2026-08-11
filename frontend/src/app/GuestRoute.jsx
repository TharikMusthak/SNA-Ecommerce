import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const GuestRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

export default GuestRoute;