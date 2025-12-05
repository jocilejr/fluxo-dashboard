import { useState, useEffect } from "react";
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
  Sparkles
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

  // Fetch user permissions
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
        "h-screen sticky top-0 bg-gradient-to-b from-card via-card to-background border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out shadow-xl",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "h-16 border-b border-border/50 flex items-center transition-all duration-300",
        collapsed ? "px-3 justify-center" : "px-5"
      )}>
        <div className={cn(
          "flex items-center gap-3 transition-all duration-300",
          collapsed && "justify-center"
        )}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <img 
              src="/logo-ov.png" 
              alt="Origem Viva" 
              className="h-9 w-9 relative z-10 drop-shadow-lg" 
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground">
                Origem Viva
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Marketing Digital
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        <div className={cn(
          "mb-4 px-3",
          collapsed && "hidden"
        )}>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Menu Principal
          </span>
        </div>
        
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full -ml-3" />
              )}
              <item.icon className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                collapsed && "mx-auto",
                !isActive && "group-hover:scale-110"
              )} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.title}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg border border-border">
                  {item.title}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200 group",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium">Recolher</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 group",
            collapsed && "justify-center"
          )}
        >
          <LogOut className={cn(
            "h-5 w-5 transition-transform duration-200",
            "group-hover:-translate-x-0.5"
          )} />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  );
}
