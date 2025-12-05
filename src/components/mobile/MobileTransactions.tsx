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

  // Mark ALL transactions as viewed on mount (fix badge issue)
  useEffect(() => {
    if (transactions.length > 0) {
      const paidIds = transactions.filter(t => t.status === "pago").map(t => t.id);
      const boletoGeradoIds = transactions.filter(t => t.type === "boleto" && t.status === "gerado").map(t => t.id);
      const pixCartaoPendenteIds = transactions.filter(t => (t.type === "pix" || t.type === "cartao") && t.status === "pendente").map(t => t.id);
      
      const stored = localStorage.getItem(VIEWED_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : { aprovados: [], "boletos-gerados": [], "pix-cartao-pendentes": [] };
      
      parsed.aprovados = [...new Set([...(parsed.aprovados || []), ...paidIds])];
      parsed["boletos-gerados"] = [...new Set([...(parsed["boletos-gerados"] || []), ...boletoGeradoIds])];
      parsed["pix-cartao-pendentes"] = [...new Set([...(parsed["pix-cartao-pendentes"] || []), ...pixCartaoPendenteIds])];
      
      localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(parsed));
    }
  }, [transactions]);

  // Also mark abandoned as viewed
  useEffect(() => {
    if (abandonedEvents.length > 0) {
      const allIds = abandonedEvents.map(e => e.id);
      localStorage.setItem(VIEWED_ABANDONED_KEY, JSON.stringify(allIds));
    }
  }, [abandonedEvents]);

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

    switch (activeTab) {
      case "pagos":
        filtered = filtered.filter(t => t.status === "pago");
        break;
      case "pendentes":
        filtered = filtered.filter(t => t.status !== "pago");
        break;
    }

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

  // Tab colors config
  const getTabStyle = (tab: TabType, isActive: boolean) => {
    if (!isActive) return "bg-[hsl(222,35%,18%)] text-[hsl(220,15%,50%)]";
    switch (tab) {
      case "pagos":
        return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      case "pendentes":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "abandonos":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      default:
        return "bg-[hsl(40,50%,55%)] text-[hsl(222,47%,11%)]";
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 space-y-2 bg-[hsl(222,47%,11%)] min-h-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-[hsl(222,35%,18%)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[hsl(222,47%,11%)]/98 backdrop-blur-xl px-3 pt-2 pb-2 space-y-2 border-b border-[hsl(40,50%,55%)]/10">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5">
          {(["hoje", "ontem", "semana"] as DateFilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all",
                dateFilter === filter
                  ? "bg-[hsl(40,50%,55%)] text-[hsl(222,47%,11%)]"
                  : "bg-[hsl(222,35%,18%)] text-[hsl(220,15%,50%)]"
              )}
            >
              {filter === "hoje" ? "Hoje" : filter === "ontem" ? "Ontem" : "7d"}
            </button>
          ))}
          <button 
            onClick={handleRefresh}
            className="ml-auto p-1.5 rounded-full bg-[hsl(222,35%,18%)] text-[hsl(220,15%,50%)]"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(220,15%,50%)]" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 rounded-lg bg-[hsl(222,35%,18%)] border-[hsl(40,50%,55%)]/10 text-xs text-[hsl(45,20%,95%)] placeholder:text-[hsl(220,15%,50%)]"
          />
        </div>

        {/* Tab Pills - Compact */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {(["todos", "pagos", "pendentes", "abandonos"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all",
                getTabStyle(tab, activeTab === tab)
              )}
            >
              <span className="capitalize">{tab === "abandonos" ? "Aband." : tab}</span>
              <span className={cn(
                "min-w-[14px] h-[14px] px-0.5 rounded text-[9px] font-bold flex items-center justify-center",
                activeTab === tab ? "bg-black/10" : "bg-[hsl(222,44%,14%)]"
              )}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-auto px-3 py-2 space-y-1.5">
        {activeTab === "abandonos" ? (
          filteredAbandoned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[hsl(220,15%,50%)]">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Nenhum abandono</p>
            </div>
          ) : (
            filteredAbandoned.map((event) => (
              <div 
                key={event.id}
                className="bg-[hsl(222,44%,14%)] border-l-2 border-l-red-500 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[hsl(45,20%,95%)] truncate max-w-[140px]">
                        {event.customer_name || "Sem nome"}
                      </p>
                      <p className="text-[9px] text-[hsl(220,15%,50%)]">
                        {formatTime(event.created_at)} • {event.event_type === "cart_abandoned" ? "Carrinho" : "Falha"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-red-400">
                    {event.amount ? formatCurrency(event.amount) : "-"}
                  </p>
                </div>
                {event.customer_phone && (
                  <button
                    onClick={() => openWhatsAppBusiness(event.customer_phone)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-[hsl(40,50%,55%)]/15 text-[hsl(40,50%,55%)] rounded-lg text-[10px] font-semibold"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp Business
                  </button>
                )}
              </div>
            ))
          )
        ) : (
          filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[hsl(220,15%,50%)]">
              <FileText className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Nenhuma transação</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              const Icon = getTypeIcon(transaction.type);
              const isPaid = transaction.status === "pago";
              
              return (
                <div 
                  key={transaction.id}
                  className={cn(
                    "bg-[hsl(222,44%,14%)] border-l-2 rounded-lg p-3",
                    isPaid ? "border-l-emerald-500" : "border-l-amber-500"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center",
                        isPaid ? "bg-emerald-500/10" : "bg-amber-500/10"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          isPaid ? "text-emerald-400" : "text-amber-400"
                        )} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[hsl(45,20%,95%)] truncate max-w-[130px]">
                          {transaction.customer_name || "Cliente"}
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-[hsl(220,15%,50%)]">
                          <span className="uppercase">{transaction.type}</span>
                          <span>•</span>
                          <span>{formatTime(transaction.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xs font-bold",
                        isPaid ? "text-emerald-400" : "text-[hsl(45,20%,95%)]"
                      )}>
                        {formatCurrency(Number(transaction.amount))}
                      </p>
                      <div className={cn(
                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold",
                        isPaid 
                          ? "bg-emerald-500/15 text-emerald-400" 
                          : "bg-amber-500/15 text-amber-400"
                      )}>
                        {isPaid ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                        {isPaid ? "Pago" : "Pendente"}
                      </div>
                    </div>
                  </div>
                  
                  {!isPaid && transaction.customer_phone && (
                    <button
                      onClick={() => openWhatsAppBusiness(transaction.customer_phone)}
                      className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 bg-[hsl(40,50%,55%)]/15 text-[hsl(40,50%,55%)] rounded-lg text-[10px] font-semibold"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
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