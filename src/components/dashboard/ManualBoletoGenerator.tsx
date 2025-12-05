import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ManualBoletoFormData {
  nome: string;
  telefone: string;
  valor: string;
  cpf: string;
}

export function ManualBoletoGenerator() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<ManualBoletoFormData>({
    nome: "",
    telefone: "",
    valor: "",
    cpf: "",
  });

  useEffect(() => {
    if (open) {
      fetchWebhookUrl();
    }
  }, [open]);

  const fetchWebhookUrl = async () => {
    const { data, error } = await supabase
      .from("manual_boleto_settings")
      .select("webhook_url")
      .single();

    if (error) {
      console.error("Error fetching webhook URL:", error);
      return;
    }
    setWebhookUrl(data?.webhook_url || null);
  };

  const handleChange = (field: keyof ManualBoletoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    return digits;
  };

  const formatCPF = (value: string) => {
    // Remove non-digits and limit to 11 digits
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits;
  };

  const handleSubmit = async () => {
    // Validate
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!formData.telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }
    if (!formData.valor.trim() || isNaN(parseFloat(formData.valor))) {
      toast.error("Valor inválido");
      return;
    }
    if (!webhookUrl) {
      toast.error("Webhook não configurado. Configure nas configurações.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formatPhone(formData.telefone),
        Valor: parseFloat(formData.valor),
        CPF: formatCPF(formData.cpf),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      toast.success("Boleto gerado com sucesso!");
      setFormData({ nome: "", telefone: "", valor: "", cpf: "" });
      setOpen(false);
    } catch (error) {
      console.error("Error generating boleto:", error);
      toast.error("Erro ao gerar boleto. Verifique o webhook.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Gerar Boleto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Boleto Manualmente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!webhookUrl && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
              Webhook não configurado. Configure nas configurações para gerar boletos.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              placeholder="Nome completo do cliente"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input
              id="telefone"
              placeholder="+5521968643431"
              value={formData.telefone}
              onChange={(e) => handleChange("telefone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$) *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              placeholder="50.00"
              value={formData.valor}
              onChange={(e) => handleChange("valor", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF (opcional)</Label>
            <Input
              id="cpf"
              placeholder="12345678901"
              maxLength={11}
              value={formData.cpf}
              onChange={(e) => handleChange("cpf", formatCPF(e.target.value))}
            />
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleSubmit}
            disabled={isLoading || !webhookUrl}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Gerando...
              </>
            ) : (
              "Gerar Boleto"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
