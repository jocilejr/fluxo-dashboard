import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Settings2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PixCardRecoverySettings() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["pix-card-recovery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pix_card_recovery_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (settings?.message) {
      setMessage(settings.message);
    }
  }, [settings]);

  const updateMessage = useMutation({
    mutationFn: async (newMessage: string) => {
      if (settings?.id) {
        const { error } = await supabase
          .from("pix_card_recovery_settings")
          .update({ message: newMessage })
          .eq("id", settings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Mensagem atualizada");
      queryClient.invalidateQueries({ queryKey: ["pix-card-recovery-settings"] });
      setOpen(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar");
    },
  });

  const handleSave = () => {
    if (!message.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }
    updateMessage.mutate(message.trim());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Configurar mensagem de recuperação</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mensagem de Recuperação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure a mensagem para recuperar PIX/Cartão pendentes.
            Variáveis: {"{nome}"}, {"{primeiro_nome}"}, {"{valor}"}
          </p>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá {nome}! Seu pagamento de {valor} está pendente..."
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateMessage.isPending}>
              {updateMessage.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
