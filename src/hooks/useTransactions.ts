import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTabNotification } from "./useTabNotification";

export interface Transaction {
  id: string;
  external_id: string | null;
  type: "boleto" | "pix" | "cartao";
  status: "gerado" | "pago" | "pendente" | "cancelado" | "expirado";
  amount: number;
  description: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
  paid_at: string | null;
  metadata: { boleto_url?: string } | null;
}

export interface TransactionStats {
  boletosGerados: number;
  boletosPagos: number;
  pixGerado: number;
  pixPago: number;
  pedidosCartao: number;
  volumeCartao: number;
}

export interface TransactionNotification {
  id: string;
  type: "boleto" | "pix" | "cartao";
  status: "gerado" | "pago" | "pendente";
  customerName: string;
  amount: number;
  timestamp: Date;
}

export function useTransactions() {
  const { notifyNewTransaction } = useTabNotification();
  const initialLoadRef = useRef(true);
  const [notifications, setNotifications] = useState<TransactionNotification[]>([]);
  
  // Store callback in ref to avoid re-subscriptions
  const notifyNewTransactionRef = useRef(notifyNewTransaction);
  
  useEffect(() => {
    notifyNewTransactionRef.current = notifyNewTransaction;
  }, [notifyNewTransaction]);

  const { data: transactions, refetch, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Transaction[];
    },
  });

  // Subscribe to realtime updates with notifications
  useEffect(() => {
    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          console.log("Realtime update:", payload);
          console.log("initialLoadRef.current:", initialLoadRef.current);
          refetch();

          // Handle notifications for INSERT and UPDATE events
          if (payload.eventType !== "INSERT" && payload.eventType !== "UPDATE") return;
          
          const newData = payload.new as Transaction;
          const oldData = payload.old as Transaction | null;
          
          if (!newData || !newData.type || !newData.status || initialLoadRef.current) return;

          // Determine notification type
          let shouldNotify = false;
          let notificationStatus: "gerado" | "pago" | "pendente" = "gerado";

          if (payload.eventType === "INSERT") {
            shouldNotify = true;
            notificationStatus = newData.status === "pago" ? "pago" : 
                                 newData.status === "pendente" ? "pendente" : "gerado";
          } else if (payload.eventType === "UPDATE") {
            // Only notify if status changed to "pago"
            if (oldData && oldData.status !== "pago" && newData.status === "pago") {
              shouldNotify = true;
              notificationStatus = "pago";
            }
          }

          if (shouldNotify) {
            const notification: TransactionNotification = {
              id: newData.id,
              type: newData.type,
              status: notificationStatus,
              customerName: newData.customer_name || "Cliente",
              amount: newData.amount,
              timestamp: new Date(),
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]);

            // Notify tab title when in background
            notifyNewTransactionRef.current();
            
            // Browser notification via Service Worker
            if (Notification.permission === 'granted' && navigator.serviceWorker) {
              const typeLabel = getNotificationTitle(newData.type, notificationStatus);
              const amount = newData.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              console.log('[Notification] Raw amount:', newData.amount, 'Formatted:', amount);
              
              navigator.serviceWorker.ready
                .then((registration) => {
                  return registration.showNotification(typeLabel, {
                    body: `${newData.customer_name || 'Cliente'} - ${amount}`,
                    icon: '/logo-ov.png',
                    badge: '/favicon.png',
                    tag: `transaction-${newData.id}-${notificationStatus}`,
                  });
                })
                .catch(() => {});
            }
          }
        }
      )
      .subscribe();

    // Mark initial load as complete after first subscription
    setTimeout(() => {
      console.log("Setting initialLoadRef to false");
      initialLoadRef.current = false;
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Calculate stats
  const stats: TransactionStats = {
    boletosGerados: transactions?.filter((t) => t.type === "boleto").length || 0,
    boletosPagos: transactions?.filter((t) => t.type === "boleto" && t.status === "pago").length || 0,
    pixGerado: transactions?.filter((t) => t.type === "pix").length || 0,
    pixPago: transactions?.filter((t) => t.type === "pix" && t.status === "pago").length || 0,
    pedidosCartao: transactions?.filter((t) => t.type === "cartao").length || 0,
    volumeCartao: transactions?.filter((t) => t.type === "cartao" && t.status === "pago")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0,
  };

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const hasNewTransaction = notifications.length > 0;

  return {
    transactions: transactions || [],
    stats,
    isLoading,
    refetch,
    hasNewTransaction,
    notifications,
    dismissNotification,
    dismissAllNotifications,
  };
}

function getNotificationTitle(type: Transaction["type"], status: "gerado" | "pago" | "pendente"): string {
  const titles: Record<string, Record<string, string>> = {
    boleto: {
      gerado: "📄 Boleto Gerado",
      pago: "✅ Boleto Pago",
      pendente: "⏳ Boleto Pendente",
    },
    pix: {
      gerado: "📱 PIX Gerado",
      pago: "✅ PIX Pago",
      pendente: "⏳ PIX Pendente",
    },
    cartao: {
      gerado: "💳 Cartão - Pedido",
      pago: "✅ Cartão Pago",
      pendente: "⏳ Cartão Pendente",
    },
  };
  return titles[type]?.[status] || "🔔 Nova Transação";
}
