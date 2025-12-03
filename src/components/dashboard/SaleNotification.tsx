import { X, TrendingUp, DollarSign, Zap } from "lucide-react";
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
        "relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-5 mb-6 shadow-2xl shadow-emerald-500/20",
        "animate-in slide-in-from-top-4 fade-in duration-500"
      )}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent animate-pulse" />
      
      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-400/30 to-emerald-500/20 blur-sm -z-10" />
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-br-full" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-emerald-400/10 to-transparent rounded-tl-full" />
      
      <div className="relative flex items-center gap-5">
        {/* Icon with enhanced pulse effect */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-emerald-400/40 rounded-2xl animate-ping" />
          <div className="absolute inset-[-4px] bg-emerald-400/20 rounded-2xl animate-pulse" />
          <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300/30">
            <DollarSign className="h-8 w-8 text-white drop-shadow-lg" />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Ao vivo
            </span>
            <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {count === 1 ? "Nova venda realizada!" : `${count} novas vendas realizadas!`}
          </h4>
          <p className="text-sm text-emerald-200/80 font-medium">
            Verifique os detalhes na tabela de transações
          </p>
        </div>
        
        {/* Stats indicator */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/20">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <span className="text-emerald-300 font-semibold text-sm">+{count}</span>
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-2.5 rounded-xl bg-emerald-800/50 hover:bg-emerald-700/50 transition-all duration-200 text-emerald-300 hover:text-white border border-emerald-600/30 hover:border-emerald-500/50 hover:scale-105"
          aria-label="Fechar notificação"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Bottom animated bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 opacity-60" />
      <div className="absolute bottom-0 left-0 h-1 w-1/3 bg-gradient-to-r from-emerald-400 to-transparent animate-pulse" style={{ animationDuration: "2s" }} />
    </div>
  );
}
