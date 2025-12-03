import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function GroupWebhookInfo() {
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-groups`;

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
      <div>
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