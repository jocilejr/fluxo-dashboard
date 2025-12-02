import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onDelete?: () => void;
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

export function TransactionsTable({ transactions, isLoading, onDelete }: TransactionsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Transação removida");
      onDelete?.();
    } catch (error: any) {
      toast.error("Erro ao remover transação");
      console.error(error);
    }
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
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Telefone</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Boleto</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
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
                    {transaction.customer_phone || '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(transaction.created_at)}</td>
                  <td className="py-4 px-4 text-sm font-medium">{formatCurrency(Number(transaction.amount))}</td>
                  <td className="py-4 px-4">
                    <Badge variant="outline" className={cn("font-medium", statusStyles[transaction.status])}>
                      {statusLabels[transaction.status]}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {transaction.type === 'boleto' && transaction.metadata?.boleto_url ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => window.open(transaction.metadata!.boleto_url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover transação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover esta transação? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(transaction.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
