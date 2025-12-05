import { useMemo, useState, useEffect } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  QrCode, 
  FileText, 
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay } from "date-fns";

export function MobileDashboard() {
  const { transactions, isLoading, refetch } = useTransactions();
  const [isRealAdmin, setIsRealAdmin] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsRealAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsRealAdmin(data?.role === "admin");
    };
    checkRole();
  }, []);

  const { data: financialSettings } = useQuery({
    queryKey: ["financial-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isRealAdmin === true,
  });

  // Filter to today's transactions
  const todayTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    
    return transactions.filter((t) => {
      const dateStr = t.status === "pago" && t.paid_at ? t.paid_at : t.created_at;
      const date = new Date(dateStr);
      return date >= todayStart && date <= todayEnd;
    });
  }, [transactions]);

  const stats = useMemo(() => {
    const paidOrders = todayTransactions
      .filter((t) => t.status === "pago")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const taxRate = financialSettings?.tax_rate || 0;
    const taxAmount = paidOrders * (taxRate / 100);
    const netRevenue = paidOrders - taxAmount;

    return {
      boletosGerados: todayTransactions.filter((t) => t.type === "boleto" && t.status === "gerado").length,
      boletosPagos: todayTransactions.filter((t) => t.type === "boleto" && t.status === "pago").length,
      pixGerado: todayTransactions.filter((t) => t.type === "pix" && t.status !== "pago").length,
      pixPago: todayTransactions.filter((t) => t.type === "pix" && t.status === "pago").length,
      cartaoGerado: todayTransactions.filter((t) => t.type === "cartao" && t.status !== "pago").length,
      cartaoPago: todayTransactions.filter((t) => t.type === "cartao" && t.status === "pago").length,
      totalPago: todayTransactions.filter((t) => t.status === "pago").length,
      paidOrders,
      netRevenue,
    };
  }, [todayTransactions, financialSettings]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-secondary/30 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Pull to refresh indicator */}
      <div className="flex justify-center">
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Revenue Card - Admin only */}
      {isRealAdmin && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <p className="text-sm text-primary-foreground/80 font-medium">Receita de Hoje</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">
              {formatCurrency(stats.paidOrders)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>{stats.totalPago} vendas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* PIX */}
        <div className="bg-card border border-border/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm font-semibold text-foreground">PIX</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pixPago}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pagos</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-muted-foreground">{stats.pixGerado}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendentes</p>
            </div>
          </div>
        </div>

        {/* Boleto */}
        <div className="bg-card border border-border/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <span className="text-sm font-semibold text-foreground">Boleto</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.boletosPagos}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pagos</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-muted-foreground">{stats.boletosGerados}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gerados</p>
            </div>
          </div>
        </div>

        {/* Cartão */}
        <div className="bg-card border border-border/30 rounded-2xl p-4 space-y-3 col-span-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-chart-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">Cartão</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.cartaoPago}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aprovados</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-muted-foreground">{stats.cartaoGerado}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendentes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground px-1">Últimas Transações</h3>
        <div className="space-y-2">
          {todayTransactions.slice(0, 5).map((t) => (
            <div 
              key={t.id}
              className="flex items-center justify-between p-3 bg-card border border-border/30 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  t.status === "pago" ? "bg-success/10" : "bg-warning/10"
                )}>
                  {t.status === "pago" ? (
                    <ArrowUpRight className="h-5 w-5 text-success" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-warning" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                    {t.customer_name || "Cliente"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">
                    {t.type} • {t.status}
                  </p>
                </div>
              </div>
              <p className={cn(
                "text-sm font-bold",
                t.status === "pago" ? "text-success" : "text-foreground"
              )}>
                {formatCurrency(Number(t.amount))}
              </p>
            </div>
          ))}
          
          {todayTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma transação hoje</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
