import { useState, useMemo, useEffect } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useAbandonedEvents } from "@/hooks/useAbandonedEvents";
import { cn } from "@/lib/utils";
import { 
  Search, 
  QrCode, 
  FileText, 
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns";
import { toast } from "sonner";

const VIEWED_STORAGE_KEY = "viewed_transactions";
const VIEWED_ABANDONED_KEY = "viewed_abandoned_events";

type TabType = "todos" | "pagos" | "pendentes" | "abandonos";
type DateFilterType = "hoje" | "ontem" | "semana";

export function MobileTransactions() {
  const { transactions, isLoading, refetch } = useTransactions();
  const { events: abandonedEvents } = useAbandonedEvents();
  const [activeTab, setActiveTab] = useState<TabType>("todos");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("hoje");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewedIds, setViewedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(VIEWED_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      return [...(parsed.aprovados || []), ...(parsed["boletos-gerados"] || []), ...(parsed["pix-cartao-pendentes"] || [])];
    } catch {
      return [];
    }
  });

  // Mark as viewed on mount
  useEffect(() => {
    if (transactions.length > 0) {
      const allIds = transactions.map(t => t.id);
      setViewedIds(prev => [...new Set([...prev, ...allIds])]);
      
      const stored = localStorage.getItem(VIEWED_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : { aprovados: [], "boletos-gerados": [], "pix-cartao-pendentes": [] };
      parsed.aprovados = [...new Set([...(parsed.aprovados || []), ...allIds])];
      localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(parsed));
    }
  }, [transactions]);

  // Also mark abandoned as viewed
  useEffect(() => {
    if (abandonedEvents.length > 0 && activeTab === "abandonos") {
      const allIds = abandonedEvents.map(e => e.id);
      localStorage.setItem(VIEWED_ABANDONED_KEY, JSON.stringify(allIds));
    }
  }, [abandonedEvents, activeTab]);

  const getDateRange = (filter: DateFilterType) => {
    const now = new Date();
    switch (filter) {
      case "hoje":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "ontem":
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "semana":
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    }
  };

  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange(dateFilter);
    
    let filtered = transactions.filter((t) => {
      const dateStr = t.status === "pago" && t.paid_at ? t.paid_at : t.created_at;
      const date = new Date(dateStr);
      return isWithinInterval(date, { start, end });
    });

    // Filter by tab
    switch (activeTab) {
      case "pagos":
        filtered = filtered.filter(t => t.status === "pago");
        break;
      case "pendentes":
        filtered = filtered.filter(t => t.status !== "pago");
        break;
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.customer_name?.toLowerCase().includes(query) ||
        t.customer_phone?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, dateFilter, activeTab, searchQuery]);

  const filteredAbandoned = useMemo(() => {
    if (activeTab !== "abandonos") return [];
    const { start, end } = getDateRange(dateFilter);
    
    return abandonedEvents.filter((e) => {
      const date = new Date(e.created_at);
      return isWithinInterval(date, { start, end });
    });
  }, [abandonedEvents, dateFilter, activeTab]);

  const counts = useMemo(() => {
    const { start, end } = getDateRange(dateFilter);
    const dateFiltered = transactions.filter((t) => {
      const dateStr = t.status === "pago" && t.paid_at ? t.paid_at : t.created_at;
      const date = new Date(dateStr);
      return isWithinInterval(date, { start, end });
    });

    return {
      todos: dateFiltered.length,
      pagos: dateFiltered.filter(t => t.status === "pago").length,
      pendentes: dateFiltered.filter(t => t.status !== "pago").length,
      abandonos: abandonedEvents.filter(e => {
        const date = new Date(e.created_at);
        return isWithinInterval(date, { start, end });
      }).length,
    };
  }, [transactions, abandonedEvents, dateFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pix": return QrCode;
      case "boleto": return FileText;
      case "cartao": return CreditCard;
      default: return FileText;
    }
  };

  const openWhatsAppBusiness = (phone: string | null) => {
    if (!phone) {
      toast.error("Sem telefone");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://api.whatsapp.com/send?phone=${fullPhone}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 bg-[hsl(222,47%,11%)] min-h-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-[hsl(222,35%,20%)] rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[hsl(222,47%,11%)]/98 backdrop-blur-xl px-4 pt-3 pb-2 space-y-3 border-b border-[hsl(40,50%,55%)]/10">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-2">
          {(["hoje", "ontem", "semana"] as DateFilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold transition-all",
                dateFilter === filter
                  ? "bg-[hsl(40,50%,55%)] text-[hsl(222,47%,11%)] shadow-lg shadow-[hsl(40,50%,55%)]/20"
                  : "bg-[hsl(222,35%,20%)] text-[hsl(220,15%,55%)]"
              )}
            >
              {filter === "hoje" ? "Hoje" : filter === "ontem" ? "Ontem" : "7 dias"}
            </button>
          ))}
          <button 
            onClick={handleRefresh}
            className="ml-auto p-2 rounded-full bg-[hsl(222,35%,20%)] text-[hsl(220,15%,55%)]"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(220,15%,55%)]" />
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-[hsl(222,35%,20%)] border-[hsl(40,50%,55%)]/10 text-sm text-[hsl(45,20%,95%)] placeholder:text-[hsl(220,15%,55%)]"
          />
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {(["todos", "pagos", "pendentes", "abandonos"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeTab === tab
                  ? "bg-[hsl(45,20%,95%)] text-[hsl(222,47%,11%)]"
                  : "bg-[hsl(222,35%,20%)] text-[hsl(220,15%,55%)]"
              )}
            >
              <span className="capitalize">{tab}</span>
              <span className={cn(
                "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                activeTab === tab ? "bg-[hsl(222,47%,11%)]/20 text-[hsl(222,47%,11%)]" : "bg-[hsl(222,44%,14%)] text-[hsl(220,15%,55%)]"
              )}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-2">
        {activeTab === "abandonos" ? (
          // Abandoned Events
          filteredAbandoned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(220,15%,55%)]">
              <AlertTriangle className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhum abandono</p>
            </div>
          ) : (
            filteredAbandoned.map((event) => (
              <div 
                key={event.id}
                className="bg-[hsl(222,44%,14%)] border border-[hsl(40,50%,55%)]/10 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-[hsl(38,92%,50%)]/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-[hsl(38,92%,50%)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[hsl(45,20%,95%)] truncate max-w-[180px]">
                        {event.customer_name || "Sem nome"}
                      </p>
                      <p className="text-[10px] text-[hsl(220,15%,55%)]">
                        {formatTime(event.created_at)} • {event.event_type === "cart_abandoned" ? "Carrinho" : "Falha"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[hsl(45,20%,95%)]">
                    {event.amount ? formatCurrency(event.amount) : "-"}
                  </p>
                </div>
                {event.customer_phone && (
                  <button
                    onClick={() => openWhatsAppBusiness(event.customer_phone)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[hsl(40,50%,55%)]/15 text-[hsl(40,50%,55%)] rounded-xl text-xs font-semibold border border-[hsl(40,50%,55%)]/20"
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Business
                  </button>
                )}
              </div>
            ))
          )
        ) : (
          // Regular Transactions
          filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(220,15%,55%)]">
              <FileText className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma transação</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const Icon = getTypeIcon(transaction.type);
              const isPaid = transaction.status === "pago";
              
              return (
                <div 
                  key={transaction.id}
                  className="bg-[hsl(222,44%,14%)] border border-[hsl(40,50%,55%)]/10 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center",
                        isPaid ? "bg-[hsl(40,50%,55%)]/15" : "bg-[hsl(38,92%,50%)]/10"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isPaid ? "text-[hsl(40,50%,55%)]" : "text-[hsl(38,92%,50%)]"
                        )} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[hsl(45,20%,95%)] truncate max-w-[160px]">
                          {transaction.customer_name || "Cliente"}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-[hsl(220,15%,55%)]">
                          <span className="uppercase">{transaction.type}</span>
                          <span>•</span>
                          <span>{formatTime(transaction.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-bold",
                        isPaid ? "text-[hsl(40,50%,55%)]" : "text-[hsl(45,20%,95%)]"
                      )}>
                        {formatCurrency(Number(transaction.amount))}
                      </p>
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        isPaid 
                          ? "bg-[hsl(40,50%,55%)]/15 text-[hsl(40,50%,55%)]" 
                          : "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]"
                      )}>
                        {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {isPaid ? "Pago" : transaction.status}
                      </div>
                    </div>
                  </div>
                  
                  {!isPaid && transaction.customer_phone && (
                    <button
                      onClick={() => openWhatsAppBusiness(transaction.customer_phone)}
                      className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 bg-[hsl(40,50%,55%)]/15 text-[hsl(40,50%,55%)] rounded-xl text-xs font-semibold border border-[hsl(40,50%,55%)]/20"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp Business
                    </button>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}