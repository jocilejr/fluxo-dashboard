import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import { useBrowserNotifications } from "./useBrowserNotifications";

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

export function useTransactions() {
  const { notifyTransaction, permission } = useBrowserNotifications();
  const initialLoadRef = useRef(true);

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
          console.log("Notification debug - initialLoadRef:", initialLoadRef.current);
          console.log("Notification debug - permission:", typeof Notification !== "undefined" ? Notification.permission : "not supported");
          refetch();

          // Send browser notification for new/updated transactions
          if (typeof Notification !== "undefined") {
            console.log("Notification check passed - Notification API exists");
            if (!initialLoadRef.current) {
              console.log("Notification check passed - not initial load");
              if (Notification.permission === "granted") {
                console.log("Notification check passed - permission granted");
                const newData = payload.new as Transaction;
                if (newData && newData.type && newData.status) {
                  console.log("Sending notification for:", newData.type, newData.status, newData.amount);
                  const result = notifyTransaction(
                    newData.type,
                    newData.status,
                    newData.amount,
                    newData.customer_name || undefined
                  );
                  console.log("Notification result:", result);
                }
              } else {
                console.log("Notification blocked - permission is:", Notification.permission);
              }
            } else {
              console.log("Notification blocked - still initial load");
            }
          } else {
            console.log("Notification blocked - API not supported");
          }
        }
      )
      .subscribe();

    // Mark initial load as complete after first subscription
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, notifyTransaction]);

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

  return {
    transactions: transactions || [],
    stats,
    isLoading,
    refetch,
  };
}
