import { X, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaleNotificationProps {
  isVisible: boolean;
  onDismiss: () => void;
  count?: number;
}

export function SaleNotification({ isVisible, onDismiss, count = 1 }: SaleNotificationProps) {
  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border border-success/30 bg-gradient-to-r from-success/10 via-success/5 to-transparent p-4 mb-4",
        "animate-in slide-in-from-top-2 fade-in duration-300"
      )}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-success/5 animate-pulse" />
      
      {/* Sparkle decorations */}
      <div className="absolute top-2 right-12 text-success/40">
        <Sparkles className="h-4 w-4 animate-pulse" />
      </div>
      <div className="absolute bottom-2 left-8 text-success/30">
        <Sparkles className="h-3 w-3 animate-pulse" style={{ animationDelay: "150ms" }} />
      </div>
      
      <div className="relative flex items-center gap-4">
        {/* Icon with pulse effect */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center shadow-lg shadow-success/25">
            <TrendingUp className="h-6 w-6 text-success-foreground" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-semibold uppercase tracking-wide">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
              </span>
              Ao vivo
            </span>
          </div>
          <h4 className="text-sm sm:text-base font-semibold text-foreground mt-1">
            {count === 1 ? "Nova venda realizada!" : `${count} novas vendas realizadas!`}
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Confira os detalhes na tabela abaixo
          </p>
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Bottom progress bar effect */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-success/50 to-transparent" />
    </div>
  );
}
