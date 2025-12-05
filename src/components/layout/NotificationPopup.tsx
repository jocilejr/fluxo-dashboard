import { useEffect, useState } from "react";
import { TransactionNotification } from "@/hooks/useTransactions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FileText,
  QrCode,
  CreditCard,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface NotificationPopupProps {
  notifications: TransactionNotification[];
  onDismiss: () => void;
}

const typeIcons = {
  boleto: FileText,
  pix: QrCode,
  cartao: CreditCard,
};

const statusConfig = {
  gerado: { label: "Gerado", color: "text-blue-500", bg: "bg-blue-500/10" },
  pago: { label: "Pago", color: "text-green-500", bg: "bg-green-500/10" },
  pendente: { label: "Pendente", color: "text-yellow-500", bg: "bg-yellow-500/10" },
};

const typeLabels = {
  boleto: "Boleto",
  pix: "PIX",
  cartao: "Cartão",
};

export function NotificationPopup({ notifications, onDismiss }: NotificationPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (notifications.length > 0) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  if (notifications.length === 0) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const latestNotification = notifications[0];
  const Icon = typeIcons[latestNotification.type];
  const config = statusConfig[latestNotification.status];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative h-9 gap-2 px-3 transition-all",
            showPulse && "animate-pulse",
            config.bg
          )}
        >
          <span className="relative flex h-2 w-2">
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              latestNotification.status === "pago" ? "bg-green-400" : "bg-blue-400"
            )} />
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              latestNotification.status === "pago" ? "bg-green-500" : "bg-blue-500"
            )} />
          </span>
          <span className="text-sm font-medium">
            {notifications.length} {notifications.length === 1 ? "nova" : "novas"}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notificações</h4>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => {
                navigate("/transacoes");
                setIsOpen(false);
              }}
            >
              Ver todas
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => {
                onDismiss();
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="max-h-80">
          <div className="p-2 space-y-1">
            {notifications.slice(0, 10).map((notification) => {
              const NotifIcon = typeIcons[notification.type];
              const notifConfig = statusConfig[notification.status];
              
              return (
                <div
                  key={`${notification.id}-${notification.status}`}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-muted/50 cursor-pointer",
                    notifConfig.bg
                  )}
                  onClick={() => {
                    navigate("/transacoes");
                    setIsOpen(false);
                  }}
                >
                  <div className={cn("p-1.5 rounded-lg", notifConfig.bg)}>
                    <NotifIcon className={cn("h-4 w-4", notifConfig.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {typeLabels[notification.type]} {notifConfig.label}
                      </span>
                      {notification.status === "pago" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.customerName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(notification.amount)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {notifications.length > 10 && (
          <div className="p-2 border-t border-border text-center">
            <span className="text-xs text-muted-foreground">
              +{notifications.length - 10} outras notificações
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
