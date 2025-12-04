import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
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

export function useTransactions() {
  const { notifyNewTransaction } = useTabNotification();
  const initialLoadRef = useRef(true);
  const [hasNewTransaction, setHasNewTransaction] = useState(false);
  
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

          // Send notification for new/updated transactions (INSERT only)
          if (payload.eventType !== "INSERT") return;
          
          const newData = payload.new as Transaction;
          if (newData && newData.type && newData.status && !initialLoadRef.current) {
            // Show alert in transactions section
            setHasNewTransaction(true);

            // Notify tab title when in background
            notifyNewTransactionRef.current();
            
            // Browser notification via Service Worker (iOS PWA compatible)
            if (Notification.permission === 'granted') {
              const typeLabel = newData.type === 'boleto' ? 'Boleto' : newData.type === 'pix' ? 'PIX' : 'Cartão';
              const amount = (newData.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              
              navigator.serviceWorker?.ready.then((registration) => {
                registration.showNotification(`🔔 Nova Transação - ${typeLabel}`, {
                  body: `${newData.customer_name || 'Cliente'} - ${amount}`,
                  icon: '/logo-ov.png',
                  badge: '/favicon.png',
                  tag: `transaction-${newData.id}`,
                });
              }).catch(console.error);
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

  const dismissNewTransaction = () => setHasNewTransaction(false);

  return {
    transactions: transactions || [],
    stats,
    isLoading,
    refetch,
    hasNewTransaction,
    dismissNewTransaction,
  };
}
