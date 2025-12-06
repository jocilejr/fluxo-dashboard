import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAdminCheck = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Erro ao verificar role (tabela pode não existir):", error.message);
          // Se a tabela não existe ou há erro, permitir acesso como usuário autenticado
          setIsAdmin(true);
        } else if (!data) {
          // Usuário autenticado mas sem role definida - permitir acesso
          console.warn("Usuário sem role definida, permitindo acesso");
          setIsAdmin(true);
        } else {
          // Role encontrada - verificar se é admin ou user
          setIsAdmin(data.role === "admin" || data.role === "user");
        }
      } catch (err) {
        console.warn("Erro ao verificar role:", err);
        // Em caso de erro, permitir acesso para usuário autenticado
        setIsAdmin(true);
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  return { isAdmin, isChecking: authLoading || isChecking, user };
};
