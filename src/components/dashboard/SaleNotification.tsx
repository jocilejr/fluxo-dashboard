
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
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 mb-4 shadow-sm",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      <button
        onClick={onDismiss}
        className="flex items-center gap-2 hover:opacity-70 transition-opacity"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <p className="text-sm text-foreground">
          +{count} {count === 1 ? "transação realizada" : "transações realizadas"}
        </p>
      </button>
    </div>
  );
}
