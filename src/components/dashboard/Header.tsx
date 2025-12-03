import { Bell, BellOff, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from "./SettingsDialog";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported } = useBrowserNotifications();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  const handleNotificationToggle = async () => {
    if (permission === "granted") {
      toast({
        title: "Notificações ativas",
        description: "Você receberá alertas de novas transações.",
      });
      return;
    }

    if (permission === "denied") {
      toast({
        title: "Notificações bloqueadas",
        description: "Permita notificações nas configurações do navegador.",
        variant: "destructive",
      });
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      toast({
        title: "Notificações ativadas",
        description: "Você receberá alertas de novas transações.",
      });
    } else {
      toast({
        title: "Permissão negada",
        description: "Notificações não foram habilitadas.",
        variant: "destructive",
      });
    }
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "US";

  const getNotificationStatus = () => {
    if (!isSupported) return "Não suportado";
    if (permission === "granted") return "Notificações ativas";
    if (permission === "denied") return "Notificações bloqueadas";
    return "Ativar notificações";
  };

  return (
    <header className="flex items-center justify-between py-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe todas as transações da sua empresa
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar transações..." 
            className="pl-10 w-64 bg-secondary/50 border-border/50 focus:border-primary/50"
          />
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={handleNotificationToggle}
              disabled={!isSupported}
            >
              {permission === "granted" ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              {permission === "granted" && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getNotificationStatus()}</p>
          </TooltipContent>
        </Tooltip>
        
        <SettingsDialog />

        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
        
        <div className="h-10 w-10 rounded-full gradient-success flex items-center justify-center font-semibold text-sm">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
