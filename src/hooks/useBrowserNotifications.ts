import { useCallback, useState } from "react";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      console.warn("Notifications not supported");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }

    if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    }

    return false;
  }, []);

  const sendNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return null;
      }

      // Try to use Service Worker notification (works in background on mobile PWA)
      // This is the ONLY method for mobile - do NOT fallback to regular Notification
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const notificationOptions: any = {
            icon: "/logo-origem-viva.png?v=2",
            badge: "/logo-origem-viva.png?v=2",
            vibrate: [200, 100, 200],
            requireInteraction: false,
            silent: false,
            tag: `notification-${Date.now()}`, // Unique tag prevents duplicates
            renotify: false,
            ...options,
          };
          await registration.showNotification(title, notificationOptions);
          console.log("Service Worker notification sent:", title);
          return true;
        } catch (error) {
          console.error("Service Worker notification failed:", error);
          // Don't fallback on mobile - just return null
          return null;
        }
      }

      // Desktop only fallback (no service worker)
      try {
        const notification = new Notification(title, {
          icon: "/logo-origem-viva.png?v=2",
          badge: "/logo-origem-viva.png?v=2",
          requireInteraction: false,
          silent: false,
          tag: `notification-${Date.now()}`,
          ...options,
        });
        setTimeout(() => notification.close(), 10000);
        return notification;
      } catch (error) {
        console.error("Regular notification failed:", error);
        return null;
      }
    },
    []
  );

  const notifyTransaction = useCallback(
    async (type: "boleto" | "pix" | "cartao", status: string, amount: number, customerName?: string) => {
      const typeNames: Record<string, string> = {
        boleto: "Boleto",
        pix: "PIX",
        cartao: "Cartão",
      };

      const statusNames: Record<string, string> = {
        gerado: "gerado",
        pago: "pago",
        pendente: "pendente",
        cancelado: "cancelado",
        expirado: "expirado",
      };

      const formattedAmount = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(amount);

      const title = `${typeNames[type] || type} ${statusNames[status] || status}`;
      const body = customerName
        ? `${customerName} - ${formattedAmount}`
        : `Valor: ${formattedAmount}`;

      return sendNotification(title, { body, tag: `transaction-${Date.now()}` });
    },
    [sendNotification]
  );

  return {
    permission,
    requestPermission,
    sendNotification,
    notifyTransaction,
    isSupported: typeof Notification !== "undefined",
  };
}
