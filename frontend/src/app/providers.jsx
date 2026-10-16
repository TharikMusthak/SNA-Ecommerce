import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@context/AuthProvider";
import NetworkStatusNotifier from "@components/common/NetworkStatusNotifier";

const queryClient = new QueryClient();

const Providers = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <NetworkStatusNotifier />
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default Providers;