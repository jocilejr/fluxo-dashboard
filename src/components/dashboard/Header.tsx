import { Bell, BellOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 gap-4 animate-fade-in">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Dashboard Financeiro</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1 hidden sm:block">
          Acompanhe todas as transações da sua empresa
        </p>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-9 w-9 sm:h-10 sm:w-10"
              onClick={handleNotificationToggle}
              disabled={!isSupported}
            >
              {permission === "granted" ? (
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
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

        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair" className="h-9 w-9 sm:h-10 sm:w-10">
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full gradient-success flex items-center justify-center font-semibold text-xs sm:text-sm">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
