import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function WebhookInfo() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = "https://suaznqybxvborpkrtdpm.supabase.co/functions/v1/webhook-receiver";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const examplePayload = {
    event: "payment.created",
    type: "boleto",
    external_id: "23793.38128 60000.000003 00000.000408 1 84340000012345",
    amount: 123.45,
    status: "gerado",
    description: "Pagamento do pedido #123",
    customer_name: "João Silva",
    customer_phone: "11999999999",
    customer_email: "joao@email.com"
  };

  const exampleUpdatePayload = {
    event: "payment.paid",
    type: "boleto",
    external_id: "23793.38128 60000.000003 00000.000408 1 84340000012345",
    amount: 123.45,
    status: "pago"
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "500ms" }}>
      <h3 className="text-lg font-semibold mb-4">Configuração de Webhook</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-2">URL do Webhook</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-secondary/50 px-4 py-3 rounded-lg text-sm font-mono break-all">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-2">Exemplo de Payload - Criar Transação</label>
          <pre className="bg-secondary/50 px-4 py-3 rounded-lg text-xs font-mono overflow-x-auto">
            {JSON.stringify(examplePayload, null, 2)}
          </pre>
        </div>

        <div>
          <label className="text-sm text-muted-foreground block mb-2">Exemplo de Payload - Atualizar Status (Boleto Pago)</label>
          <pre className="bg-secondary/50 px-4 py-3 rounded-lg text-xs font-mono overflow-x-auto">
            {JSON.stringify(exampleUpdatePayload, null, 2)}
          </pre>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Campos obrigatórios:</strong> type (boleto, pix, cartao), amount</p>
          <p><strong>Campos do cliente:</strong> customer_name, customer_phone, customer_email, customer_document</p>
          <p><strong>Status aceitos:</strong> gerado, pago, pendente, cancelado, expirado</p>
          <p><strong>Atualização:</strong> Use o mesmo external_id (código de barras) para atualizar o status de um boleto existente</p>
        </div>
      </div>
    </div>
  );
}
