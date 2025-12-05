import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryProduct {
  id: string;
  name: string;
  slug: string;
}

interface LinkGeneratorProps {
  open: boolean;
  onClose: () => void;
  product: DeliveryProduct | null;
}

const LinkGenerator = ({ open, onClose, product }: LinkGeneratorProps) => {
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [customDomain, setCustomDomain] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCustomDomain();
    }
  }, [open]);

  const loadCustomDomain = async () => {
    try {
      const { data } = await supabase
        .from("delivery_settings")
        .select("custom_domain")
        .limit(1)
        .single();

      if (data?.custom_domain) {
        setCustomDomain(data.custom_domain);
      }
    } catch (error) {
      console.error("Erro ao carregar domínio:", error);
    }
  };

  const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
  const cleanPhone = phone.replace(/\D/g, "");
  const generatedUrl = cleanPhone
    ? `${baseUrl}/${product?.slug}?telefone=${cleanPhone}`
    : "";

  const handleCopy = async () => {
    if (!generatedUrl) return;

    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleOpen = () => {
    if (generatedUrl) {
      window.open(generatedUrl, "_blank");
    }
  };

  const handleClose = () => {
    setPhone("");
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Link de Entrega</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Produto</Label>
            <p className="text-sm font-medium">{product?.name}</p>
            <code className="text-xs text-muted-foreground block bg-muted p-2 rounded">
              /{product?.slug}?telefone=XXXXX
            </code>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp do Lead *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5511999999999"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Número com código do país (será o destino do redirecionamento)
            </p>
          </div>

          {generatedUrl && (
            <div className="space-y-2">
              <Label>Link Gerado</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copiar"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpen}
                  title="Abrir"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
            <Button onClick={handleCopy} disabled={!generatedUrl}>
              {copied ? "Copiado!" : "Copiar Link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkGenerator;
