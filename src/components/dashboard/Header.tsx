import { Bell, BellOff, LogOut, Download, Check, Share, MoreVertical } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported } = useBrowserNotifications();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installDialogType, setInstallDialogType] = useState<"ios" | "android">("ios");

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
      setInstallDialogType("ios");
      setShowInstallDialog(true);
      return;
    }

    if (result === "android") {
      setInstallDialogType("android");
      setShowInstallDialog(true);
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

  return (
    <>
      <header className="flex items-center justify-between py-3 sm:py-4 animate-fade-in">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <img 
            src="/logo-origem-viva.png" 
            alt="Origem Viva" 
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg shadow-md object-contain bg-card p-1"
          />
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Origem Viva</h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs hidden sm:block">
              Dashboard de Vendas
            </p>
          </div>
        </div>
        
        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2">
          {(isInstallable || isInstalled) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={handleInstallApp}
                >
                  {isInstalled ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Download className="h-4 w-4 text-primary animate-pulse" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isInstalled ? "App instalado" : "Instalar app"}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={handleNotificationToggle}
                disabled={!isSupported}
              >
                {permission === "granted" ? (
                  <Bell className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{permission === "granted" ? "Notificações ativas" : "Ativar notificações"}</p>
            </TooltipContent>
          </Tooltip>
          
          <SettingsDialog />

          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair" className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
          
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-xs text-primary">
            {userInitials}
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="flex sm:hidden items-center gap-1">
          {(isInstallable && !isInstalled) && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={handleInstallApp}
            >
              <Download className="h-4 w-4 text-primary" />
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={handleNotificationToggle}
            disabled={!isSupported}
          >
            {permission === "granted" ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-xs text-primary">
                  {userInitials}
                </div>
                <span className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
              <DropdownMenuSeparator />
              <SettingsDialog asMobileItem />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Install Instructions Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {installDialogType === "ios" ? "Instalar no iPhone" : "Instalar no Android"}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                {installDialogType === "ios" ? (
                  <>
                    <p>Para instalar o Origem Viva no seu iPhone:</p>
                    <ol className="list-none space-y-3 text-left">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                        <span>Toque no botão <Share className="inline h-4 w-4 mx-1" /> Compartilhar na barra do Safari</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                        <span>Role para baixo e toque em "Adicionar à Tela de Início"</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</span>
                        <span>Toque em "Adicionar" no canto superior direito</span>
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p>Para instalar o Origem Viva no seu Android:</p>
                    <ol className="list-none space-y-3 text-left">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                        <span>Toque no menu <MoreVertical className="inline h-4 w-4 mx-1" /> do Chrome (3 pontinhos)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                        <span>Toque em "Adicionar à tela inicial" ou "Instalar app"</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</span>
                        <span>Confirme tocando em "Adicionar" ou "Instalar"</span>
                      </li>
                    </ol>
                  </>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  Após instalar, abra o app pela tela inicial para receber notificações.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
