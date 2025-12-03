import { useCallback, useState } from "react";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
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

      // Use Service Worker notification when available (works in PWA)
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            icon: "/logo-ov.png",
            badge: "/logo-ov.png",
            tag: `notification-${Date.now()}`,
            ...options,
          });
          return true;
        } catch (error) {
          // Fallback to regular notification
        }
      }

      // Desktop notification
      try {
        const notification = new Notification(title, {
          icon: "/logo-ov.png",
          tag: `notification-${Date.now()}`,
          ...options,
        });
        setTimeout(() => notification.close(), 8000);
        return notification;
      } catch {
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

      return sendNotification(title, { body });
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
