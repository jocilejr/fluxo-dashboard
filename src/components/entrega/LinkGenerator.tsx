import { useState } from "react";
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

  const baseUrl = window.location.origin;
  const generatedUrl = phone
    ? `${baseUrl}/e/${product?.slug}?telefone=${phone.replace(/\D/g, "")}`
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
            <code className="text-xs text-muted-foreground">/e/{product?.slug}</code>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone do Lead *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5511999999999"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Digite o telefone com código do país
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
