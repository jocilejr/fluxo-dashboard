import { Bell, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from "./SettingsDialog";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "US";

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
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] font-medium flex items-center justify-center">
            3
          </span>
        </Button>
        
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
