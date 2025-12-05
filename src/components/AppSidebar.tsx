import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  List, 
  RefreshCcw, 
  Bot, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  permissionKey: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/", permissionKey: "dashboard" },
  { title: "Transações", icon: List, path: "/transacoes", permissionKey: "transacoes" },
  { title: "Recuperação", icon: RefreshCcw, path: "/recuperacao", permissionKey: "recuperacao" },
  { title: "Typebots", icon: Bot, path: "/typebots", permissionKey: "typebots", adminOnly: true },
  { title: "Gerar Boleto", icon: FileText, path: "/gerar-boleto", permissionKey: "gerar_boleto" },
  { title: "Configurações", icon: Settings, path: "/configuracoes", permissionKey: "configuracoes", adminOnly: true },
];

interface AppSidebarProps {
  isAdmin: boolean;
  userId: string | null;
}

export function AppSidebar({ isAdmin, userId }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { data: userPermissions } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  const hasPermission = (item: NavItem) => {
    if (isAdmin) return true;
    if (item.adminOnly) return false;
    const permission = userPermissions?.find(p => p.permission_key === item.permissionKey);
    return permission ? permission.is_allowed : true;
  };

  const visibleItems = navItems.filter(hasPermission);

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 flex flex-col transition-all duration-300 ease-out",
        "bg-sidebar-background border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border/50",
        collapsed ? "px-3 justify-center" : "px-4"
      )}>
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          collapsed && "justify-center"
        )}>
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 bg-primary/20 blur-md rounded-lg opacity-60" />
            <img 
              src="/logo-ov.png" 
              alt="Origem Viva" 
              className="h-8 w-8 relative z-10 rounded-lg" 
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-sidebar-foreground truncate">
                Origem Viva
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                Marketing
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {!collapsed && (
          <div className="px-3 mb-3 pt-1">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              Menu
            </span>
          </div>
        )}
        
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] flex-shrink-0",
                collapsed && "mx-auto"
              )} />
              {!collapsed && (
                <span className="text-[13px] font-medium truncate">{item.title}</span>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-border">
                  {item.title}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border/50 space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-[18px] w-[18px]" />
          ) : (
            <>
              <ChevronLeft className="h-[18px] w-[18px]" />
              <span className="text-[13px] font-medium">Recolher</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span className="text-[13px] font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
