import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "success" | "info" | "warning" | "default";
  delay?: number;
  isLoading?: boolean;
}

const variantStyles = {
  success: "border-success/10 hover:border-success/20",
  info: "border-info/10 hover:border-info/20",
  warning: "border-warning/10 hover:border-warning/20",
  default: "border-border/30 hover:border-border/50",
};

const iconContainerStyles = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  default: "bg-secondary text-muted-foreground",
};

const valueStyles = {
  success: "text-foreground",
  info: "text-foreground",
  warning: "text-foreground",
  default: "text-foreground",
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = "default",
  delay = 0,
  isLoading = false
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card/60 border border-border/30 rounded-xl p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "bg-card/60 border rounded-xl p-4 lg:p-5 transition-all duration-200 animate-slide-up",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <p className={cn(
            "text-xl lg:text-2xl font-bold tracking-tight",
            valueStyles[variant]
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[10px] lg:text-[11px] text-muted-foreground/80 truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium pt-1",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span className="text-[10px]">{trend.isPositive ? "▲" : "▼"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal hidden lg:inline">vs período anterior</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-2 lg:p-2.5 rounded-lg shrink-0",
          iconContainerStyles[variant]
        )}>
          <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
        </div>
      </div>
    </div>
  );
}
