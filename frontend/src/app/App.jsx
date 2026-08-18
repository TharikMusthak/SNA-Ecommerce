
import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";

import Loaders from "@components/loaders/Loaders";
import { useAuth } from "@context/AuthProvider";

import Providers from "./providers";
import { router } from "./routes";

const AppContent = () => {
  const { loading } = useAuth();
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsStarting(false), 1500);

    return () => window.clearTimeout(timer);
  }, []);

  if (isStarting || loading) {
    return <Loaders />;
  }

  return <RouterProvider router={router} />;
};

function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}

export default App;
