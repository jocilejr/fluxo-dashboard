import { cn } from "@/lib/utils";
import { TransactionNotification } from "@/hooks/useTransactions";
import { X, FileText, Smartphone, CreditCard, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaleNotificationProps {
  isVisible: boolean;
  notifications: TransactionNotification[];
  onDismiss: () => void;
}

const typeIcons = {
  boleto: FileText,
  pix: Smartphone,
  cartao: CreditCard,
};

const statusColors = {
  gerado: "text-blue-500",
  pago: "text-emerald-500",
  pendente: "text-amber-500",
};

const statusBgColors = {
  gerado: "bg-blue-500/10 border-blue-500/30",
  pago: "bg-emerald-500/10 border-emerald-500/30",
  pendente: "bg-amber-500/10 border-amber-500/30",
};

function getNotificationLabel(type: TransactionNotification["type"], status: TransactionNotification["status"]): string {
  const labels: Record<string, Record<string, string>> = {
    boleto: {
      gerado: "Boleto Gerado",
      pago: "Boleto Pago",
      pendente: "Boleto Pendente",
    },
    pix: {
      gerado: "PIX Gerado",
      pago: "PIX Pago",
      pendente: "PIX Pendente",
    },
    cartao: {
      gerado: "Cartão - Pedido",
      pago: "Cartão Pago",
      pendente: "Cartão Pendente",
    },
  };
  return labels[type]?.[status] || "Nova Transação";
}

export function SaleNotification({ isVisible, notifications, onDismiss }: SaleNotificationProps) {
  if (!isVisible || notifications.length === 0) return null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div 
      className={cn(
        "rounded-lg border border-border bg-card p-4 mb-4 shadow-sm space-y-3",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-sm font-medium text-foreground">
            {notifications.length === 1 
              ? "Nova transação" 
              : `${notifications.length} novas transações`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {notifications.slice(0, 5).map((notification) => {
          const Icon = typeIcons[notification.type];
          const StatusIcon = notification.status === "pago" ? CheckCircle : Clock;
          
          return (
            <div
              key={`${notification.id}-${notification.status}`}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
                statusBgColors[notification.status]
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("shrink-0", statusColors[notification.status])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-medium", statusColors[notification.status])}>
                      {getNotificationLabel(notification.type, notification.status)}
                    </span>
                    <StatusIcon className={cn("h-3 w-3", statusColors[notification.status])} />
                  </div>
                  <p className="text-sm truncate text-foreground">
                    {notification.customerName}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {formatCurrency(notification.amount)}
              </span>
            </div>
          );
        })}
        {notifications.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{notifications.length - 5} mais
          </p>
        )}
      </div>
    </div>
  );
}