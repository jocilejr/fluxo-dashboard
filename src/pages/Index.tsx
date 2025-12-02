import { Header } from "@/components/dashboard/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { PaymentMethodsChart } from "@/components/dashboard/PaymentMethodsChart";
import { 
  FileText, 
  CheckCircle, 
  QrCode, 
  CreditCard,
  TrendingUp,
  Wallet
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pb-8">
        <Header />
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            title="Boletos Gerados"
            value="1.284"
            subtitle="Este mês"
            icon={FileText}
            trend={{ value: 12.5, isPositive: true }}
            variant="info"
            delay={0}
          />
          <StatCard
            title="Boletos Pagos"
            value="892"
            subtitle="69.5% taxa de conversão"
            icon={CheckCircle}
            trend={{ value: 8.2, isPositive: true }}
            variant="success"
            delay={50}
          />
          <StatCard
            title="PIX Gerado"
            value="2.156"
            subtitle="Este mês"
            icon={QrCode}
            trend={{ value: 23.1, isPositive: true }}
            variant="success"
            delay={100}
          />
          <StatCard
            title="PIX Pago"
            value="1.984"
            subtitle="92% taxa de conversão"
            icon={Wallet}
            trend={{ value: 18.7, isPositive: true }}
            variant="success"
            delay={150}
          />
          <StatCard
            title="Pedidos Cartão"
            value="567"
            subtitle="Solicitações"
            icon={CreditCard}
            trend={{ value: 5.4, isPositive: true }}
            variant="warning"
            delay={200}
          />
          <StatCard
            title="Pagamentos Cartão"
            value="R$ 127.5K"
            subtitle="Volume total"
            icon={TrendingUp}
            trend={{ value: 15.3, isPositive: true }}
            variant="default"
            delay={250}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <PaymentMethodsChart />
          </div>
        </div>

        {/* Transactions Table */}
        <TransactionsTable />
      </div>
    </div>
  );
};

export default Index;
