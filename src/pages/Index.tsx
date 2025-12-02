import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { WebhookInfo } from "@/components/dashboard/WebhookInfo";
import { useTransactions } from "@/hooks/useTransactions";
import { 
  FileText, 
  CheckCircle, 
  QrCode, 
  CreditCard,
  TrendingUp,
  Wallet
} from "lucide-react";

const Index = () => {
  const { transactions, stats, isLoading } = useTransactions();

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
      <div className="container mx-auto px-4 pb-8">
        <Header />
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            title="Boletos Gerados"
            value={stats.boletosGerados.toLocaleString('pt-BR')}
            subtitle="Este mês"
            icon={FileText}
            variant="info"
            delay={0}
            isLoading={isLoading}
          />
          <StatCard
            title="Boletos Pagos"
            value={stats.boletosPagos.toLocaleString('pt-BR')}
            subtitle={calculateConversionRate(stats.boletosPagos, stats.boletosGerados)}
            icon={CheckCircle}
            variant="success"
            delay={50}
            isLoading={isLoading}
          />
          <StatCard
            title="PIX Gerado"
            value={stats.pixGerado.toLocaleString('pt-BR')}
            subtitle="Este mês"
            icon={QrCode}
            variant="success"
            delay={100}
            isLoading={isLoading}
          />
          <StatCard
            title="PIX Pago"
            value={stats.pixPago.toLocaleString('pt-BR')}
            subtitle={calculateConversionRate(stats.pixPago, stats.pixGerado)}
            icon={Wallet}
            variant="success"
            delay={150}
            isLoading={isLoading}
          />
          <StatCard
            title="Pedidos Cartão"
            value={stats.pedidosCartao.toLocaleString('pt-BR')}
            subtitle="Solicitações"
            icon={CreditCard}
            variant="warning"
            delay={200}
            isLoading={isLoading}
          />
          <StatCard
            title="Pagamentos Cartão"
            value={formatCurrency(stats.volumeCartao)}
            subtitle="Volume total"
            icon={TrendingUp}
            variant="default"
            delay={250}
            isLoading={isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <RevenueChart transactions={transactions} />
          </div>
          <div>
            <PaymentMethodsChart transactions={transactions} />
          </div>
        </div>

        {/* Transactions and Webhook Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionsTable transactions={transactions} isLoading={isLoading} />
          </div>
          <div>
            <WebhookInfo />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
