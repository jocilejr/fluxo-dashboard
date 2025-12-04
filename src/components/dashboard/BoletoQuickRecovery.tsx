import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transaction } from "@/hooks/useTransactions";
import { supabase } from "@/integrations/supabase/client";
import { 
  Copy, 
  Check, 
  FileText, 
  Image as ImageIcon,
  User,
  Phone,
  Mail,
  Barcode
} from "lucide-react";
import { toast } from "sonner";

interface BoletoQuickRecoveryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

interface RecoveryBlock {
  id: string;
  type: "text" | "pdf" | "image";
  content: string;
  order: number;
}

interface RecoveryTemplate {
  id: string;
  name: string;
  blocks: RecoveryBlock[];
  is_default: boolean;
}

export function BoletoQuickRecovery({ open, onOpenChange, transaction }: BoletoQuickRecoveryProps) {
  const [template, setTemplate] = useState<RecoveryTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDefaultTemplate();
    }
  }, [open]);

  const fetchDefaultTemplate = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("boleto_recovery_templates")
        .select("*")
        .eq("is_default", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setTemplate({
          id: data.id,
          name: data.name,
          is_default: data.is_default,
          blocks: Array.isArray(data.blocks) ? (data.blocks as unknown as RecoveryBlock[]) : [],
        });
      } else {
        // Fetch any template if no default
        const { data: anyTemplate } = await supabase
          .from("boleto_recovery_templates")
          .select("*")
          .limit(1)
          .single();

        if (anyTemplate) {
          setTemplate({
            id: anyTemplate.id,
            name: anyTemplate.name,
            is_default: anyTemplate.is_default,
            blocks: Array.isArray(anyTemplate.blocks) ? (anyTemplate.blocks as unknown as RecoveryBlock[]) : [],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR");
  };

  const replaceVariables = (text: string): string => {
    if (!transaction) return text;

    const metadata = transaction.metadata as Record<string, unknown> | null;
    const dueDate = metadata?.due_date
      ? formatDate(String(metadata.due_date))
      : "-";

    return text
      .replace(/{nome}/g, transaction.customer_name || "Cliente")
      .replace(/{valor}/g, formatCurrency(Number(transaction.amount)))
      .replace(/{vencimento}/g, dueDate)
      .replace(/{codigo_barras}/g, transaction.external_id || "-");
  };

  const handleCopy = async (text: string, blockId: string) => {
    const processedText = replaceVariables(text);
    await navigator.clipboard.writeText(processedText);
    setCopiedId(blockId);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyField = async (value: string, fieldId: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(fieldId);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!transaction) return null;

  const metadata = transaction.metadata as Record<string, unknown> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boleto
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Quick info cards */}
          <div 
            className="p-3 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors group"
            onClick={() => transaction.customer_name && handleCopyField(transaction.customer_name, "name")}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <User className="h-3 w-3" />
              <span>Cliente</span>
              {transaction.customer_name && (
                copiedId === "name" ? (
                  <Check className="h-3 w-3 text-success ml-auto" />
                ) : (
                  <Copy className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )
              )}
            </div>
            <p className="font-medium text-sm">{transaction.customer_name || "-"}</p>
          </div>

          <div 
            className="p-3 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors group"
            onClick={() => transaction.customer_phone && handleCopyField(transaction.customer_phone, "phone")}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Phone className="h-3 w-3" />
              <span>Telefone</span>
              {transaction.customer_phone && (
                copiedId === "phone" ? (
                  <Check className="h-3 w-3 text-success ml-auto" />
                ) : (
                  <Copy className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )
              )}
            </div>
            <p className="font-medium text-sm">{transaction.customer_phone || "-"}</p>
          </div>

          <div 
            className="p-3 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors group"
            onClick={() => transaction.customer_email && handleCopyField(transaction.customer_email, "email")}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Mail className="h-3 w-3" />
              <span>Email</span>
              {transaction.customer_email && (
                copiedId === "email" ? (
                  <Check className="h-3 w-3 text-success ml-auto" />
                ) : (
                  <Copy className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )
              )}
            </div>
            <p className="font-medium text-sm truncate">{transaction.customer_email || "-"}</p>
          </div>

          <div 
            className="p-3 rounded-lg bg-primary/10 border border-primary/30 cursor-pointer hover:bg-primary/20 transition-colors group"
            onClick={() => transaction.external_id && handleCopyField(transaction.external_id, "barcode")}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Barcode className="h-3 w-3" />
              <span>Código de Barras</span>
              {transaction.external_id && (
                copiedId === "barcode" ? (
                  <Check className="h-3 w-3 text-success ml-auto" />
                ) : (
                  <Copy className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )
              )}
            </div>
            <p className="font-mono text-xs truncate">{transaction.external_id || "-"}</p>
          </div>
        </div>

        {/* Value highlight */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Valor do Boleto</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(Number(transaction.amount))}</p>
        </div>

        {/* Messages section */}
        <div className="border-t border-border/30 pt-4">
          <h4 className="text-sm font-medium mb-3">Mensagens de Recuperação</h4>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando mensagens...
            </div>
          ) : !template || template.blocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum template configurado</p>
              <p className="text-xs mt-1">Configure templates nas ações da tabela</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px]">
              <div className="space-y-3 pr-4">
                {template.blocks
                  .sort((a, b) => a.order - b.order)
                  .map((block) => {
                    if (block.type === "text") {
                      const processedText = replaceVariables(block.content);
                      return (
                        <div
                          key={block.id}
                          className="p-3 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors group"
                          onClick={() => handleCopy(block.content, block.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm whitespace-pre-wrap flex-1">{processedText}</p>
                            <div className="shrink-0">
                              {copiedId === block.id ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (block.type === "pdf") {
                      return (
                        <div
                          key={block.id}
                          className="p-4 rounded-lg bg-secondary/20 border border-dashed border-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">PDF do Boleto</p>
                              <p className="text-xs text-muted-foreground">
                                Arraste para o WhatsApp Web
                              </p>
                            </div>
                            {metadata?.boleto_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(String(metadata.boleto_url), "_blank")}
                              >
                                Abrir PDF
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (block.type === "image") {
                      return (
                        <div
                          key={block.id}
                          className="p-4 rounded-lg bg-secondary/20 border border-dashed border-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <ImageIcon className="h-8 w-8 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Imagem do Boleto</p>
                              <p className="text-xs text-muted-foreground">
                                Screenshot para arrastar ao WhatsApp
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
