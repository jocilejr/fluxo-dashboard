import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ShoppingCart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function AbandonedWebhookInfo() {
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-abandoned`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const exampleCartAbandonedPayload = {
    event_type: "cart_abandoned",
    customer_name: "João Silva",
    customer_phone: "11999998888",
    customer_email: "joao@email.com",
    customer_document: "123.456.789-00",
    amount: 197.00,
    product_name: "Curso de Marketing Digital",
    funnel_stage: "checkout",
    utm_source: "instagram",
    utm_medium: "cpc",
    utm_campaign: "black_friday",
    utm_term: "marketing digital",
    utm_content: "video_ad_1",
    metadata: {
      cart_id: "cart_12345",
      page_url: "https://exemplo.com/checkout"
    }
  };

  const exampleBoletoFailedPayload = {
    event_type: "boleto_failed",
    customer_name: "Maria Santos",
    customer_phone: "11888887777",
    customer_email: "maria@email.com",
    customer_document: "987.654.321-00",
    amount: 497.00,
    product_name: "Mentoria Premium",
    funnel_stage: "payment",
    error_message: "CPF inválido",
    metadata: {
      attempt_id: "attempt_67890"
    }
  };

  return (
    <div className="bg-card/60 border border-border/30 rounded-xl p-5 lg:p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="h-4 w-4 text-warning" />
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-foreground">Webhook de Abandono/Falha</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Receba eventos de carrinhos abandonados e falhas na geração de boletos
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">URL do Webhook</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-secondary/50 px-3 py-2 rounded text-xs break-all border border-border/30">
              {webhookUrl}
            </code>
            <Button variant="outline" size="icon" onClick={copyToClipboard} className="h-9 w-9 shrink-0">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2 flex items-center gap-2">
              <ShoppingCart className="h-3.5 w-3.5 text-warning" />
              Exemplo: Carrinho Abandonado
            </h4>
            <pre className="bg-secondary/30 p-3 rounded-lg text-xs overflow-x-auto border border-border/20">
              {JSON.stringify(exampleCartAbandonedPayload, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="text-xs font-medium text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              Exemplo: Falha no Boleto
            </h4>
            <pre className="bg-secondary/30 p-3 rounded-lg text-xs overflow-x-auto border border-border/20">
              {JSON.stringify(exampleBoletoFailedPayload, null, 2)}
            </pre>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/20">
          <p><strong>Campos aceitos:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li><code className="bg-secondary/50 px-1 rounded">event_type</code>: "cart_abandoned" ou "boleto_failed"</li>
            <li><code className="bg-secondary/50 px-1 rounded">customer_name</code>, <code className="bg-secondary/50 px-1 rounded">customer_phone</code>, <code className="bg-secondary/50 px-1 rounded">customer_email</code>, <code className="bg-secondary/50 px-1 rounded">customer_document</code></li>
            <li><code className="bg-secondary/50 px-1 rounded">amount</code>: valor numérico ou string</li>
            <li><code className="bg-secondary/50 px-1 rounded">product_name</code>, <code className="bg-secondary/50 px-1 rounded">funnel_stage</code></li>
            <li><code className="bg-secondary/50 px-1 rounded">utm_source</code>, <code className="bg-secondary/50 px-1 rounded">utm_medium</code>, <code className="bg-secondary/50 px-1 rounded">utm_campaign</code>, <code className="bg-secondary/50 px-1 rounded">utm_term</code>, <code className="bg-secondary/50 px-1 rounded">utm_content</code></li>
            <li><code className="bg-secondary/50 px-1 rounded">error_message</code>: mensagem de erro (para falhas)</li>
            <li><code className="bg-secondary/50 px-1 rounded">metadata</code>: objeto com dados adicionais</li>
          </ul>
          <p className="mt-2"><strong>Nenhum campo é obrigatório.</strong> Envie apenas os dados disponíveis.</p>
        </div>
      </div>
    </div>
  );
}
