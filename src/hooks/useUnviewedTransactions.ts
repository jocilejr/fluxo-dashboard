import { useMemo, useEffect, useState } from "react";
import { Transaction } from "./useTransactions";

const VIEWED_STORAGE_KEY = "viewed_transactions";

type TabKey = "aprovados" | "boletos-gerados" | "pix-cartao-pendentes";

export function useUnviewedTransactions(transactions: Transaction[]) {
  const [viewedIds, setViewedIds] = useState<Record<TabKey, string[]>>(() => {
    try {
      const stored = localStorage.getItem(VIEWED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : { aprovados: [], "boletos-gerados": [], "pix-cartao-pendentes": [] };
    } catch {
      return { aprovados: [], "boletos-gerados": [], "pix-cartao-pendentes": [] };
    }
  });

  // Listen for localStorage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(VIEWED_STORAGE_KEY);
        if (stored) {
          setViewedIds(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    };

    // Check storage periodically since storage event doesn't fire in same tab
    const interval = setInterval(handleStorageChange, 1000);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Categorize transactions by tab
  const tabTransactions = useMemo(() => ({
    aprovados: transactions.filter(t => t.status === "pago"),
    "boletos-gerados": transactions.filter(t => t.type === "boleto" && t.status === "gerado"),
    "pix-cartao-pendentes": transactions.filter(t => (t.type === "pix" || t.type === "cartao") && t.status === "pendente"),
  }), [transactions]);

  // Calculate total unviewed count across all tabs
  const totalUnviewed = useMemo(() => {
    let total = 0;
    (Object.keys(tabTransactions) as TabKey[]).forEach((tab) => {
      const tabTxIds = tabTransactions[tab].map(t => t.id);
      const viewedInTab = viewedIds[tab] || [];
      total += tabTxIds.filter(id => !viewedInTab.includes(id)).length;
    });
    return total;
  }, [tabTransactions, viewedIds]);

  return totalUnviewed;
}
