import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Transaction } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      
      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const customerName = t.customer_name?.toLowerCase() || "";
        const customerPhone = t.customer_phone?.toLowerCase() || "";
        const externalId = t.external_id?.toLowerCase() || "";
        const date = formatDate(t.created_at).toLowerCase();
        
        return (
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          externalId.includes(query) ||
          date.includes(query)
        );
      }
      
      return true;
    });
  }, [transactions, searchQuery, typeFilter, statusFilter]);

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
    <div className="glass-card rounded-xl p-4 sm:p-6 animate-slide-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Transações Recentes</h3>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {filteredTransactions.length} transações
        </span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] text-sm">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="gerado">Gerado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          {searchQuery ? (
            <>
              <p className="text-base sm:text-lg font-medium">Nenhuma transação encontrada</p>
              <p className="text-xs sm:text-sm mt-2">Tente buscar com outros termos</p>
            </>
          ) : (
            <>
              <p className="text-base sm:text-lg font-medium">Nenhuma transação ainda</p>
              <p className="text-xs sm:text-sm mt-2">As transações aparecerão aqui quando você receber webhooks</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {filteredTransactions.slice(0, 10).map((transaction) => (
              <div 
                key={transaction.id} 
                className="border border-border/30 rounded-lg p-3 bg-secondary/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={cn("font-medium text-xs", typeStyles[transaction.type])}>
                    {typeLabels[transaction.type]}
                  </Badge>
                  <Badge variant="outline" className={cn("font-medium text-xs", statusStyles[transaction.status])}>
                    {statusLabels[transaction.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate max-w-[60%]">
                    {transaction.customer_name || '-'}
                  </span>
                  <span className="text-sm font-bold">{formatCurrency(Number(transaction.amount))}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(transaction.created_at)}</span>
                  <div className="flex items-center gap-1">
                    {transaction.type === 'boleto' && transaction.metadata?.boleto_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => window.open(transaction.metadata!.boleto_url, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[90vw] rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover transação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Telefone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Boleto</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 10).map((transaction) => (
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
                    <td className="py-4 px-4 text-sm text-muted-foreground hidden lg:table-cell">
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
        </>
      )}
    </div>
  );
}
