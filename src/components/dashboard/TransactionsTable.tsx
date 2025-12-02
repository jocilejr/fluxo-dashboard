import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  type: "boleto" | "pix" | "cartao";
  status: "pago" | "pendente" | "cancelado";
  value: number;
  date: string;
  description: string;
}

const mockTransactions: Transaction[] = [
  { id: "1", type: "pix", status: "pago", value: 1250.00, date: "02/12/2024", description: "Pagamento cliente #4521" },
  { id: "2", type: "boleto", status: "pendente", value: 3500.00, date: "02/12/2024", description: "Fatura mensal #892" },
  { id: "3", type: "cartao", status: "pago", value: 890.50, date: "01/12/2024", description: "Venda online #1233" },
  { id: "4", type: "pix", status: "pago", value: 2100.00, date: "01/12/2024", description: "Transferência recebida" },
  { id: "5", type: "boleto", status: "cancelado", value: 450.00, date: "30/11/2024", description: "Boleto expirado #441" },
  { id: "6", type: "cartao", status: "pendente", value: 1800.00, date: "30/11/2024", description: "Pedido cartão #7788" },
];

const typeLabels = {
  boleto: "Boleto",
  pix: "PIX",
  cartao: "Cartão",
};

const statusStyles = {
  pago: "bg-success/20 text-success border-success/30",
  pendente: "bg-warning/20 text-warning border-warning/30",
  cancelado: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusLabels = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

const typeStyles = {
  boleto: "bg-info/20 text-info border-info/30",
  pix: "bg-success/20 text-success border-success/30",
  cartao: "bg-chart-4/20 text-chart-4 border-chart-4/30",
};

export function TransactionsTable() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Transações Recentes</h3>
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          Ver todas →
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Descrição</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockTransactions.map((transaction) => (
              <tr 
                key={transaction.id} 
                className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
              >
                <td className="py-4 px-4">
                  <Badge variant="outline" className={cn("font-medium", typeStyles[transaction.type])}>
                    {typeLabels[transaction.type]}
                  </Badge>
                </td>
                <td className="py-4 px-4 text-sm">{transaction.description}</td>
                <td className="py-4 px-4 text-sm text-muted-foreground">{transaction.date}</td>
                <td className="py-4 px-4 text-sm font-medium">{formatCurrency(transaction.value)}</td>
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
    </div>
  );
}
