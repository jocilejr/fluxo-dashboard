import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Transaction } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const typeLabels = {
  boleto: "Boleto",
  pix: "PIX",
  cartao: "Cartão",
};

const statusStyles = {
  pago: "bg-success/20 text-success border-success/30",
  gerado: "bg-info/20 text-info border-info/30",
  pendente: "bg-warning/20 text-warning border-warning/30",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
  expirado: "bg-muted/50 text-muted-foreground border-muted/50",
};

const statusLabels = {
  pago: "Pago",
  gerado: "Gerado",
  pendente: "Pendente",
  cancelado: "Cancelado",
  expirado: "Expirado",
};

const typeStyles = {
  boleto: "bg-info/20 text-info border-info/30",
  pix: "bg-success/20 text-success border-success/30",
  cartao: "bg-chart-4/20 text-chart-4 border-chart-4/30",
};

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Transações Recentes</h3>
        <span className="text-sm text-muted-foreground">
          {transactions.length} transações
        </span>
      </div>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Nenhuma transação ainda</p>
          <p className="text-sm mt-2">As transações aparecerão aqui quando você receber webhooks</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Descrição</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((transaction) => (
                <tr 
                  key={transaction.id} 
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <Badge variant="outline" className={cn("font-medium", typeStyles[transaction.type])}>
                      {typeLabels[transaction.type]}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm font-medium">
                    {transaction.customer_name || '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {transaction.description || `Cód: ${transaction.external_id?.slice(0, 12) || '-'}...`}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(transaction.created_at)}</td>
                  <td className="py-4 px-4 text-sm font-medium">{formatCurrency(Number(transaction.amount))}</td>
                  <td className="py-4 px-4">
                    <Badge variant="outline" className={cn("font-medium", statusStyles[transaction.status])}>
                      {statusLabels[transaction.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
