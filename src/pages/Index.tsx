import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { DateFilter, DateFilterValue, getDefaultDateFilter } from "@/components/dashboard/DateFilter";
import { useTransactions } from "@/hooks/useTransactions";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { isWithinInterval } from "date-fns";
import { 
  FileText, 
  QrCode, 
  CreditCard,
  DollarSign,
  Receipt
} from "lucide-react";

const Index = () => {
  const { transactions, isLoading, refetch } = useTransactions();
  const { user } = useAdminCheck();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter);

  // Filter transactions by date
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const date = new Date(t.created_at);
      return isWithinInterval(date, { start: dateFilter.startDate, end: dateFilter.endDate });
    });
  }, [transactions, dateFilter]);

  // Calculate stats from filtered transactions
  const stats = useMemo(() => {
    const totalOrders = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const paidOrders = filteredTransactions
      .filter((t) => t.status === "pago")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      boletosGerados: filteredTransactions.filter((t) => t.type === "boleto").length,
      boletosPagos: filteredTransactions.filter((t) => t.type === "boleto" && t.status === "pago").length,
      pixGerado: filteredTransactions.filter((t) => t.type === "pix").length,
      pixPago: filteredTransactions.filter((t) => t.type === "pix" && t.status === "pago").length,
      pedidosCartao: filteredTransactions.filter((t) => t.type === "cartao").length,
      cartaoPago: filteredTransactions.filter((t) => t.type === "cartao" && t.status === "pago").length,
      totalOrders,
      paidOrders,
    };
  }, [filteredTransactions]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pb-8">
        <Header />
        
        {/* Date Filter */}
        <div className="mb-6">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
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
          {isRealAdmin && (
            <>
              <StatCard
                title="Valor Total"
                value={formatCurrency(stats.totalOrders)}
                subtitle="Todos os pedidos"
                icon={Receipt}
                variant="default"
                delay={200}
                isLoading={isLoading}
              />
              <StatCard
                title="Valor Líquido"
                value={formatCurrency(stats.paidOrders)}
                subtitle="Pedidos pagos"
                icon={DollarSign}
                variant="success"
                delay={250}
                isLoading={isLoading}
              />
            </>
          )}
        </div>

        {/* Charts Row - Only visible for admins */}
        {isRealAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <RevenueChart transactions={transactions} dateFilter={dateFilter} />
            </div>
            <div>
              <PaymentMethodsChart transactions={filteredTransactions} />
            </div>
          </div>
        )}

        {/* Transactions */}
        <TransactionsTable transactions={filteredTransactions} isLoading={isLoading} onDelete={refetch} />
      </div>
    </div>
  );
};

export default Index;
