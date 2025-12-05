import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTransactions } from "@/hooks/useTransactions";

interface AppLayoutProps {
  children: React.ReactNode;
}

const pageConfig: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Visão geral do seu negócio" },
  "/transacoes": { title: "Transações", subtitle: "Gerencie todas as transações" },
  "/recuperacao": { title: "Recuperação", subtitle: "Recupere vendas perdidas" },
  "/projetos": { title: "Quadros", subtitle: "Organize suas tarefas" },
  "/typebots": { title: "Typebots", subtitle: "Análise de performance" },
  "/gerar-boleto": { title: "Gerar Boleto", subtitle: "Crie novos boletos" },
  "/configuracoes": { title: "Configurações", subtitle: "Ajustes do sistema" },
};

export function AppLayout({ children }: AppLayoutProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const location = useLocation();
  const { notifications } = useTransactions();

  const currentPage = pageConfig[location.pathname] || { title: "Página", subtitle: "" };
  const unviewedCount = notifications.length;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      if (user) {
        setUserName(user.email?.split("@")[0] || "Usuário");
        
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsAdmin(data?.role === "admin");
      }
    };
    getUser();
  }, []);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <AppSidebar isAdmin={isAdmin} userId={userId} unviewedTransactions={unviewedCount} />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 lg:h-16 border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6">
          {/* Mobile Menu */}
          <div className="lg:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[240px] border-r border-border">
                <AppSidebar isAdmin={isAdmin} userId={userId} unviewedTransactions={unviewedCount} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Page Title - Desktop */}
          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-foreground">{currentPage.title}</h1>
            <p className="text-xs text-muted-foreground">{currentPage.subtitle}</p>
          </div>

          {/* Mobile Title */}
          <div className="lg:hidden flex items-center gap-2">
            <img src="/logo-ov.png" alt="Origem Viva" className="h-7 w-7" />
            <span className="font-semibold text-sm">{currentPage.title}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Bell className="h-[18px] w-[18px]" />
            </Button>
            
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/50">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary uppercase">
                  {userName.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-medium text-foreground capitalize">{userName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isAdmin ? "Administrador" : "Colaborador"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-grid-pattern">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
