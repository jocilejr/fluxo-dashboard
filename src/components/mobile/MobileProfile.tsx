import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  LogOut, 
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsAdmin(roleData?.role === "admin");

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setProfile(profileData);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/auth");
  };

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick,
    danger = false 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value?: string;
    onClick?: () => void;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 bg-[hsl(222,44%,14%)] border rounded-2xl",
        danger ? "border-destructive/30" : "border-[hsl(40,50%,55%)]/10"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center",
        danger ? "bg-destructive/10" : "bg-[hsl(40,50%,55%)]/10"
      )}>
        <Icon className={cn(
          "h-5 w-5",
          danger ? "text-destructive" : "text-[hsl(40,50%,55%)]"
        )} />
      </div>
      <div className="flex-1 text-left">
        <p className={cn(
          "text-sm font-medium",
          danger ? "text-destructive" : "text-[hsl(45,20%,95%)]"
        )}>
          {label}
        </p>
        {value && (
          <p className="text-xs text-[hsl(220,15%,55%)] truncate">{value}</p>
        )}
      </div>
      {onClick && <ChevronRight className="h-4 w-4 text-[hsl(220,15%,55%)]" />}
    </button>
  );

  return (
    <div className="p-4 space-y-6 bg-[hsl(222,47%,11%)] min-h-full">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-6">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[hsl(40,50%,55%)] to-[hsl(40,45%,40%)] flex items-center justify-center shadow-xl shadow-[hsl(40,50%,55%)]/20 mb-4">
          <span className="text-2xl font-bold text-[hsl(222,47%,11%)] uppercase">
            {user?.email?.charAt(0) || "U"}
          </span>
        </div>
        <h2 className="text-lg font-bold text-[hsl(45,20%,95%)]">
          {profile?.name || user?.email?.split("@")[0] || "Usuário"}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "px-3 py-1 rounded-full text-xs font-semibold",
            isAdmin 
              ? "bg-[hsl(40,50%,55%)]/15 text-[hsl(40,50%,55%)]" 
              : "bg-[hsl(222,35%,20%)] text-[hsl(220,15%,55%)]"
          )}>
            {isAdmin ? "Administrador" : "Colaborador"}
          </span>
        </div>
      </div>

      {/* Account Info */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[hsl(220,15%,55%)] uppercase tracking-wider px-1">
          Conta
        </h3>
        <div className="space-y-2">
          <MenuItem 
            icon={Mail} 
            label="Email" 
            value={user?.email}
          />
          <MenuItem 
            icon={Phone} 
            label="Telefone" 
            value={profile?.phone || "Não configurado"}
          />
          <MenuItem 
            icon={Shield} 
            label="Permissão" 
            value={isAdmin ? "Acesso total" : "Acesso limitado"}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[hsl(220,15%,55%)] uppercase tracking-wider px-1">
          Ações
        </h3>
        <div className="space-y-2">
          <MenuItem 
            icon={LogOut} 
            label="Sair da conta" 
            onClick={handleLogout}
            danger
          />
        </div>
      </div>

      {/* App Info */}
      <div className="text-center pt-6 pb-4">
        <p className="text-xs text-[hsl(220,15%,55%)]">
          Origem Viva Dashboard
        </p>
        <p className="text-[10px] text-[hsl(220,15%,55%)]/50">
          Versão 1.0.0
        </p>
      </div>
    </div>
  );
}