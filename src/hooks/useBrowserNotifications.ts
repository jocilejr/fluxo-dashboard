import { useEffect, useCallback, useState } from "react";

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
    (title: string, options?: NotificationOptions) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") {
        return null;
      }

      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: true,
        silent: false,
        ...options,
      });

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      return notification;
    },
    []
  );

  const notifyTransaction = useCallback(
    (type: "boleto" | "pix" | "cartao", status: string, amount: number, customerName?: string) => {
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
