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
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    // Admins have access to everything
    if (isAdmin) return true;
    
    // Admin-only items are hidden for non-admins
    if (item.adminOnly) return false;
    
    // Check user permissions - if no permission record exists, allow by default
    const permission = userPermissions?.find(p => p.permission_key === item.permissionKey);
    return permission ? permission.is_allowed : true;
  };

  const visibleItems = navItems.filter(hasPermission);

  return (
    <div 
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo-ov.png" alt="Origem Viva" className="h-8 w-8" />
            <span className="font-bold text-lg">Origem Viva</span>
          </div>
        )}
        {collapsed && (
          <img src="/logo-ov.png" alt="Origem Viva" className="h-8 w-8 mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
        >
          <LogOut className={cn("h-5 w-5", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </div>
  );
}
