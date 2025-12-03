import { Bell, BellOff, LogOut, Download, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from "./SettingsDialog";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { usePWA } from "@/hooks/usePWA";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported } = useBrowserNotifications();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

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
        description: "Você receberá alertas de novas vendas.",
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
        description: "Você receberá alertas de novas vendas.",
      });
    } else {
      toast({
        title: "Permissão negada",
        description: "Notificações não foram habilitadas.",
        variant: "destructive",
      });
    }
  };

  const handleInstallApp = async () => {
    if (isInstalled) {
      toast({
        title: "App já instalado",
        description: "O Origem Viva já está instalado no seu dispositivo.",
      });
      return;
    }

    const result = await installApp();
    
    if (result === "ios") {
      setShowIOSDialog(true);
      return;
    }
    
    if (result === true) {
      toast({
        title: "App instalado!",
        description: "Agora você receberá notificações push no seu dispositivo.",
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

  const getInstallStatus = () => {
    if (isInstalled) return "App instalado";
    if (isIOS) return "Instalar no iPhone";
    if (isInstallable) return "Instalar app";
    return "Instalar app";
  };

  return (
    <>
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-6 gap-4 animate-fade-in">
        <div className="min-w-0 flex items-center gap-3">
          <img 
            src="/logo-origem-viva.png" 
            alt="Origem Viva" 
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl shadow-lg"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Origem Viva</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
              Dashboard de Vendas
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 justify-end">
          {(isInstallable || isInstalled) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-9 w-9 sm:h-10 sm:w-10"
                  onClick={handleInstallApp}
                >
                  {isInstalled ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  ) : (
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getInstallStatus()}</p>
              </TooltipContent>
            </Tooltip>
          )}

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

      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar no iPhone</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>Para instalar o Origem Viva no seu iPhone:</p>
              <ol className="list-decimal list-inside space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span>1.</span>
                  <span>Toque no botão <Share className="inline h-4 w-4" /> Compartilhar na barra do Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>2.</span>
                  <span>Role para baixo e toque em "Adicionar à Tela de Início"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>3.</span>
                  <span>Toque em "Adicionar" no canto superior direito</span>
                </li>
              </ol>
              <p className="text-sm text-muted-foreground mt-4">
                Após instalar, abra o app pela tela inicial para receber notificações.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
