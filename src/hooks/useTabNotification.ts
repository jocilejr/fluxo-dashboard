import { useEffect, useRef, useCallback, useState } from "react";

const ORIGINAL_TITLE = "Origem Viva";

export function useTabNotification() {
  const [pendingCount, setPendingCount] = useState(0);
  const isTabVisibleRef = useRef(!document.hidden);
  const originalFaviconRef = useRef<string>("/logo-origem-viva.png?v=2");

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      
      // Reset when user returns to tab
      if (!document.hidden && pendingCount > 0) {
        setPendingCount(0);
        document.title = ORIGINAL_TITLE;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pendingCount]);

  // Update title when pending count changes
  useEffect(() => {
    if (pendingCount > 0 && document.hidden) {
      document.title = `(${pendingCount}) Nova Venda! - ${ORIGINAL_TITLE}`;
    }
  }, [pendingCount]);

  // Flash the title when tab is in background
  useEffect(() => {
    if (pendingCount === 0 || !document.hidden) return;

    let showAlert = true;
    const interval = setInterval(() => {
      if (document.hidden) {
        document.title = showAlert 
          ? `🔔 (${pendingCount}) Nova Venda!` 
          : ORIGINAL_TITLE;
        showAlert = !showAlert;
      } else {
        document.title = ORIGINAL_TITLE;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      document.title = ORIGINAL_TITLE;
    };
  }, [pendingCount]);

  const notifyNewTransaction = useCallback(() => {
    // Only increment if tab is not visible
    if (document.hidden) {
      setPendingCount((prev) => prev + 1);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setPendingCount(0);
    document.title = ORIGINAL_TITLE;
  }, []);

  return {
    pendingCount,
    notifyNewTransaction,
    clearNotifications,
    isTabVisible: () => isTabVisibleRef.current,
  };
}
