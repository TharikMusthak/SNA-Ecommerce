import { useCallback, useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSlow, setIsSlow] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [pingLatency, setPingLatency] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    let slowByNav = false;
    if (connection) {
      if (
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g" ||
        (connection.rtt && connection.rtt >= 1500)
      ) {
        slowByNav = true;
      }
    }

    if (!navigator.onLine) {
      setIsOffline(true);
      setIsSlow(false);
      setIsChecking(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const startTime = Date.now();

    try {
      const response = await fetch(`/favicon.ico?_t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      setPingLatency(duration);

      if (response.ok || response.status < 500) {
        setIsOffline(false);
        if (duration > 2000 || slowByNav) {
          setIsSlow(true);
        } else {
          setIsSlow(false);
        }
      } else {
        setIsSlow(slowByNav || duration > 2000);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setIsSlow(true);
      } else if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        setIsOffline(true);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setWasOffline(true);
      setDismissed(false);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsSlow(false);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener("change", checkConnection);
    }

    checkConnection();

    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 20000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", checkConnection);
      }
      clearInterval(interval);
    };
  }, [checkConnection]);

  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    isOffline,
    isSlow,
    wasOffline,
    isChecking,
    pingLatency,
    dismissed,
    checkConnection,
    resetWasOffline,
    dismiss,
  };
}
