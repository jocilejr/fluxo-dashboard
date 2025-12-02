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
  success: "glow-success border-success/20",
  info: "glow-info border-info/20",
  warning: "glow-warning border-warning/20",
  default: "border-border/50",
};

const iconVariantStyles = {
  success: "gradient-success",
  info: "gradient-info",
  warning: "gradient-warning",
  default: "bg-secondary",
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
      <div className={cn("glass-card rounded-xl p-6", variantStyles[variant])}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "glass-card rounded-xl p-6 animate-slide-up",
        variantStyles[variant]
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs último mês</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          iconVariantStyles[variant]
        )}>
          <Icon className="h-6 w-6 text-foreground" />
        </div>
      </div>
    </div>
  );
}
