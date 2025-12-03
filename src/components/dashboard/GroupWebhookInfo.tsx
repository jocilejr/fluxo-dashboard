import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

export function GroupWebhookInfo() {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-groups`;

  // Fetch groups
  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Delete group mutation
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Grupo removido" });
      queryClient.invalidateQueries({ queryKey: ["groups-settings"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover o grupo", variant: "destructive" });
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const exampleEntryPayload = {
    group_name: "Grupo VIP",
    event_type: "entry",
  };

  const exampleExitPayload = {
    group_name: "Grupo VIP",
    event_type: "exit",
  };

  const exampleFullPayload = {
    group_name: "Grupo VIP",
    current_members: 150,
    entries: 5,
    exits: 2,
  };

  return (
    <div className="space-y-4">
      {/* Groups List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Grupos Cadastrados</h4>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.current_members} membros • {group.total_entries} entradas • {group.total_exits} saídas
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteGroup.mutate(group.id)}
                  disabled={deleteGroup.isPending}
                  title="Remover grupo"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">
            Nenhum grupo cadastrado. Grupos são criados automaticamente ao receber webhooks.
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">URL do Webhook de Grupos</h4>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-muted px-3 py-2 rounded text-xs break-all">
            {webhookUrl}
          </code>
          <Button variant="outline" size="icon" onClick={copyToClipboard}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Exemplo: Entrada no grupo</h4>
        <pre className="bg-muted p-3 rounded text-xs overflow-auto">
          {JSON.stringify(exampleEntryPayload, null, 2)}
        </pre>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Exemplo: Saída do grupo</h4>
        <pre className="bg-muted p-3 rounded text-xs overflow-auto">
          {JSON.stringify(exampleExitPayload, null, 2)}
        </pre>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Exemplo: Atualização completa</h4>
        <pre className="bg-muted p-3 rounded text-xs overflow-auto">
          {JSON.stringify(exampleFullPayload, null, 2)}
        </pre>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Campos:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><code>group_name</code>: Nome do grupo (obrigatório)</li>
          <li><code>event_type</code>: "entry" ou "exit" para eventos individuais</li>
          <li><code>current_members</code>: Total de membros atuais</li>
          <li><code>entries</code>: Quantidade de entradas a adicionar</li>
          <li><code>exits</code>: Quantidade de saídas a adicionar</li>
        </ul>
      </div>
    </div>
  );
}