import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { DateFilter, DateFilterValue, getDefaultDateFilter } from "@/components/dashboard/DateFilter";
import { SaleNotification } from "@/components/dashboard/SaleNotification";
import { BoletoRecoveryDashboard } from "@/components/dashboard/BoletoRecoveryDashboard";
import { useTransactions } from "@/hooks/useTransactions";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, 
  QrCode, 
  CreditCard,
  DollarSign,
  Percent,
  Wallet,
  Bot,
  RefreshCcw,
  List
} from "lucide-react";
import { GroupStatsCards } from "@/components/dashboard/GroupStatsCards";
import { GroupHistoryChart } from "@/components/dashboard/GroupHistoryChart";

const Index = () => {
  const navigate = useNavigate();
  const { transactions, isLoading, refetch, hasNewTransaction, notifications, dismissAllNotifications } = useTransactions();
  const { user } = useAdminCheck();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter);

  // Check if current user has admin role (not just 'user' role)
  const [isRealAdmin, setIsRealAdmin] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkRole = async () => {
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
  }, [user]);

  // Fetch financial settings (tax rate)
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

  // Fetch manual revenues filtered by date
  const { data: manualRevenues } = useQuery({
    queryKey: ["manual-revenues", dateFilter.startDate, dateFilter.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_revenues")
        .select("*")
        .gte("received_at", dateFilter.startDate.toISOString())
        .lte("received_at", dateFilter.endDate.toISOString());
      if (error) throw error;
      return data;
    },
    enabled: isRealAdmin === true,
  });

  // Filter transactions by date (use paid_at for paid transactions, created_at for others)
  // Convert to Brazil timezone (UTC-3) for accurate date comparison
  const filteredTransactions = useMemo(() => {
    // Helper to get date string in Brazil timezone (YYYY-MM-DD)
    const getBrazilDateString = (utcDateStr: string) => {
      const date = new Date(utcDateStr);
      // Format in Brazil timezone
      return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    };
    
    // Get filter date strings (YYYY-MM-DD format)
    const startDateStr = dateFilter.startDate.toLocaleDateString('en-CA');
    const endDateStr = dateFilter.endDate.toLocaleDateString('en-CA');
    
    return transactions.filter((t) => {
      const dateStr = t.status === "pago" && t.paid_at ? t.paid_at : t.created_at;
      const transactionDateStr = getBrazilDateString(dateStr);
      
      return transactionDateStr >= startDateStr && transactionDateStr <= endDateStr;
    });
  }, [transactions, dateFilter]);

  // Calculate stats from filtered transactions
  const stats = useMemo(() => {
    const totalOrders = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const paidOrders = filteredTransactions
      .filter((t) => t.status === "pago")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate manual revenues total
    const manualRevenueTotal = manualRevenues?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

    // Total revenue (paid transactions + manual revenues)
    const totalRevenue = paidOrders + manualRevenueTotal;

    // Tax calculation
    const taxRate = financialSettings?.tax_rate || 0;
    const taxAmount = totalRevenue * (taxRate / 100);
    const netRevenue = totalRevenue - taxAmount;

    return {
      boletosGerados: filteredTransactions.filter((t) => t.type === "boleto").length,
      boletosPagos: filteredTransactions.filter((t) => t.type === "boleto" && t.status === "pago").length,
      pixGerado: filteredTransactions.filter((t) => t.type === "pix").length,
      pixPago: filteredTransactions.filter((t) => t.type === "pix" && t.status === "pago").length,
      pedidosCartao: filteredTransactions.filter((t) => t.type === "cartao").length,
      cartaoPago: filteredTransactions.filter((t) => t.type === "cartao" && t.status === "pago").length,
      totalOrders,
      paidOrders,
      manualRevenueTotal,
      totalRevenue,
      taxRate,
      taxAmount,
      netRevenue,
    };
  }, [filteredTransactions, manualRevenues, financialSettings]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateConversionRate = (paid: number, total: number) => {
    if (total === 0) return "0%";
    return `${((paid / total) * 100).toFixed(1)}% taxa de conversão`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 pb-8">
        <Header />
        
        {/* Typebot Analytics - Admin only */}
        {isRealAdmin && (
          <div className="mb-6">
            <button
              onClick={() => navigate("/typebots")}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-[1px] transition-all hover:shadow-lg hover:shadow-purple-500/25"
            >
              <div className="relative flex items-center justify-between rounded-xl bg-background/95 px-6 py-4 backdrop-blur-sm transition-all group-hover:bg-background/80">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Analytics de Typebots</h3>
                    <p className="text-sm text-muted-foreground">Métricas, funil e performance em tempo real</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-purple-500 group-hover:text-purple-400">
                  Acessar
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        )}
        
        {/* Admin-only: Date Filter and Stats */}
        {isRealAdmin && (
          <>
            {/* Date Filter */}
            <div className="mb-4 sm:mb-6">
              <DateFilter value={dateFilter} onChange={setDateFilter} />
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard
                title="Boletos Gerados"
                value={stats.boletosGerados.toLocaleString('pt-BR')}
                subtitle="No período"
                icon={FileText}
                variant="info"
                delay={0}
                isLoading={isLoading}
              />
              <StatCard
                title="Boletos Pagos"
                value={stats.boletosPagos.toLocaleString('pt-BR')}
                subtitle={calculateConversionRate(stats.boletosPagos, stats.boletosGerados)}
                icon={FileText}
                variant="success"
                delay={50}
                isLoading={isLoading}
              />
              <StatCard
                title="PIX Gerado"
                value={stats.pixGerado.toLocaleString('pt-BR')}
                subtitle={calculateConversionRate(stats.pixPago, stats.pixGerado)}
                icon={QrCode}
                variant="success"
                delay={100}
                isLoading={isLoading}
              />
              <StatCard
                title="Pedidos Cartão"
                value={stats.pedidosCartao.toLocaleString('pt-BR')}
                subtitle={calculateConversionRate(stats.cartaoPago, stats.pedidosCartao)}
                icon={CreditCard}
                variant="warning"
                delay={150}
                isLoading={isLoading}
              />
              <StatCard
                title="Faturamento Bruto"
                value={formatCurrency(stats.totalRevenue)}
                subtitle={stats.manualRevenueTotal > 0 ? `+${formatCurrency(stats.manualRevenueTotal)} manual` : "Pedidos pagos"}
                icon={DollarSign}
                variant="info"
                delay={200}
                isLoading={isLoading}
              />
              {stats.taxRate > 0 && (
                <StatCard
                  title={`Imposto (${stats.taxRate}%)`}
                  value={`-${formatCurrency(stats.taxAmount)}`}
                  subtitle="Dedução fiscal"
                  icon={Percent}
                  variant="warning"
                  delay={250}
                  isLoading={isLoading}
                />
              )}
              <StatCard
                title="Valor Líquido"
                value={formatCurrency(stats.netRevenue)}
                subtitle={stats.taxRate > 0 ? "Após impostos" : "Receita total"}
                icon={Wallet}
                variant="success"
                delay={300}
                isLoading={isLoading}
              />
            </div>
          </>
        )}

        {/* Charts Row - Only visible for admins */}
        {isRealAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <RevenueChart transactions={transactions} dateFilter={dateFilter} />
            </div>
            <div>
              <PaymentMethodsChart transactions={filteredTransactions} />
            </div>
          </div>
        )}

        {/* Group Stats Cards - Admin only */}
        {isRealAdmin && (
          <div className="mb-6">
            <GroupStatsCards />
          </div>
        )}

        {/* Group History Chart - Visible to all users */}
        <div className="mb-6">
          <GroupHistoryChart />
        </div>

        {/* Sale Notification */}
        <SaleNotification 
          isVisible={hasNewTransaction}
          notifications={notifications}
          onDismiss={dismissAllNotifications}
        />

        {/* Transactions / Boleto Recovery Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
            <TabsTrigger value="transactions" className="gap-2">
              <List className="h-4 w-4" />
              Transações Recentes
            </TabsTrigger>
            <TabsTrigger value="recovery" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Recuperação de Boletos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions">
            <TransactionsTable 
              transactions={transactions} 
              isLoading={isLoading} 
              onDelete={refetch}
              isAdmin={isRealAdmin === true}
            />
          </TabsContent>
          
          <TabsContent value="recovery">
            <BoletoRecoveryDashboard 
              transactions={transactions}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
