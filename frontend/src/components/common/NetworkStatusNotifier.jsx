import { useEffect, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  SignalLow,
  WifiOff,
  X,
} from "lucide-react";
import { useNetworkStatus } from "@hooks/useNetworkStatus";

const NetworkStatusNotifier = () => {
  const {
    isOffline,
    isSlow,
    wasOffline,
    isChecking,
    dismissed,
    checkConnection,
    resetWasOffline,
    dismiss,
  } = useNetworkStatus();

  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOffline && wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        resetWasOffline();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline, resetWasOffline]);

  // Back online toast notification
  if (showRestored && !isOffline) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl bg-emerald-600 px-5 py-3.5 text-white shadow-2xl shadow-emerald-900/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <CheckCircle2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h4 className="text-sm font-bold leading-tight">Back Online</h4>
          <p className="text-xs text-emerald-100">
            Your internet connection has been restored.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowRestored(false);
            resetWasOffline();
          }}
          className="ml-2 rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (dismissed) return null;

  // No Internet (Offline) Modal Warning
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600 ring-8 ring-red-50/50">
              <WifiOff size={38} className="animate-pulse" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500"></span>
              </span>
            </div>

            <h3 className="text-2xl font-bold text-gray-900">
              No Internet Connection
            </h3>

            <p className="mt-2.5 text-sm leading-relaxed text-gray-600">
              We couldn't connect to the network. Please check your Wi-Fi or mobile data connection and try again.
            </p>

            <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={checkConnection}
                disabled={isChecking}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#079447] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#079447]/20 transition-all hover:bg-[#057a3a] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#079447] disabled:opacity-70"
              >
                <RefreshCw
                  size={18}
                  className={isChecking ? "animate-spin" : ""}
                />
                <span>{isChecking ? "Checking..." : "Try Reconnecting"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Slow Internet Warning Popup Banner
  if (isSlow) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] w-full max-w-sm overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
            <SignalLow size={20} className="animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-900">
                Slow Internet Connection
              </h4>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg p-1 text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
                aria-label="Dismiss warning"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Your network speed seems slow right now. Pages or items might take longer to load.
            </p>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={checkConnection}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 underline transition-colors hover:text-amber-950 disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={isChecking ? "animate-spin" : ""}
                />
                <span>{isChecking ? "Testing speed..." : "Re-check Connection"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default NetworkStatusNotifier;
