import { BoletoRecoveryDashboard } from "@/components/dashboard/BoletoRecoveryDashboard";
import { useTransactions } from "@/hooks/useTransactions";

const Recuperacao = () => {
  const { transactions, isLoading } = useTransactions();

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">Recuperação de Boletos</h1>
      
      <BoletoRecoveryDashboard 
        transactions={transactions}
        isLoading={isLoading}
      />
    </div>
  );
};

export default Recuperacao;
