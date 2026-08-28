
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

  // Disable right-click save, context menu, and dragging on media elements project-wide
  useEffect(() => {
    const preventMediaSave = (e) => {
      const target = e.target;
      if (!target) return;
      const isMedia =
        target.tagName === "IMG" ||
        target.tagName === "VIDEO" ||
        target.tagName === "AUDIO" ||
        target.closest?.("img") ||
        target.closest?.("video") ||
        target.closest?.("audio");

      if (isMedia) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventMediaSave, true);
    document.addEventListener("dragstart", preventMediaSave, true);

    return () => {
      document.removeEventListener("contextmenu", preventMediaSave, true);
      document.removeEventListener("dragstart", preventMediaSave, true);
    };
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
