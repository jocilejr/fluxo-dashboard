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
  Barcode,
  Download,
  Loader2,
  ExternalLink
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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDefaultTemplate();
      if (transaction) {
        loadPdf();
      }
    } else {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }, [open, transaction]);

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

  const loadPdf = async () => {
    const metadata = transaction?.metadata as Record<string, unknown> | null;
    const boletoUrl = metadata?.boleto_url as string | undefined;

    if (!boletoUrl) return;

    setIsLoadingPdf(true);
    try {
      const { data: proxyData, error } = await supabase.functions.invoke("pdf-proxy", {
        body: { url: boletoUrl },
      });

      if (error) throw error;
      if (!proxyData?.data) throw new Error("No PDF data received");

      const binaryString = atob(proxyData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: "application/pdf" });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(pdfUrl);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Erro ao carregar boleto");
    } finally {
      setIsLoadingPdf(false);
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

  const handleDownloadPdf = () => {
    if (pdfBlobUrl) {
      const a = document.createElement("a");
      a.href = pdfBlobUrl;
      a.download = `boleto-${transaction?.customer_name || "cliente"}.pdf`;
      a.click();
    }
  };

  const handleOpenPdfInNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, "_blank");
    }
  };

  if (!transaction) return null;

  const metadata = transaction.metadata as Record<string, unknown> | null;

  const renderBlock = (block: RecoveryBlock) => {
    if (block.type === "text") {
      const processedText = replaceVariables(block.content);
      return (
        <div
          key={block.id}
          className="p-4 rounded-lg bg-secondary/30 border border-border/30 cursor-pointer hover:bg-secondary/50 transition-colors group"
          onClick={() => handleCopy(block.content, block.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm whitespace-pre-wrap flex-1 leading-relaxed">{processedText}</p>
            <div className="shrink-0 mt-1">
              {copiedId === block.id ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <Copy className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para copiar
          </p>
        </div>
      );
    }

    if (block.type === "pdf") {
      return (
        <div
          key={block.id}
          className="p-4 rounded-lg bg-primary/5 border-2 border-dashed border-primary/30"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">PDF do Boleto</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingPdf ? "Carregando..." : pdfBlobUrl ? "Baixe e arraste para o WhatsApp" : "Indisponível"}
              </p>
            </div>
            {isLoadingPdf ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : pdfBlobUrl ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleOpenPdfInNewTab} className="gap-1">
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </Button>
                <Button size="sm" onClick={handleDownloadPdf} className="gap-1">
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div
          key={block.id}
          className="p-4 rounded-lg bg-success/5 border-2 border-dashed border-success/30"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10">
              <ImageIcon className="h-8 w-8 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Imagem do Boleto</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingPdf ? "Carregando PDF..." : pdfBlobUrl ? "Abra o PDF e tire um print" : "Indisponível"}
              </p>
            </div>
            {pdfBlobUrl && (
              <Button size="sm" variant="outline" onClick={handleOpenPdfInNewTab} className="gap-1">
                <ExternalLink className="h-4 w-4" />
                Abrir PDF
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 Dica: Abra o PDF, tire um print (Win+Shift+S) e arraste para o WhatsApp
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boleto
          </DialogTitle>
        </DialogHeader>

        {/* Customer info grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
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
            className="p-3 rounded-lg bg-primary/10 border border-primary/30 cursor-pointer hover:bg-primary/20 transition-colors group col-span-2"
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
            <p className="font-mono text-sm">{transaction.external_id || "-"}</p>
          </div>
        </div>

        {/* Value highlight */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 mb-4 text-center">
          <p className="text-xs text-muted-foreground">Valor do Boleto</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(Number(transaction.amount))}</p>
        </div>

        {/* Stacked blocks section */}
        <div className="border-t border-border/30 pt-4">
          <h4 className="text-sm font-medium mb-3">Sequência de Recuperação</h4>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !template || template.blocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border/30 rounded-lg">
              <p className="text-sm">Nenhum template configurado</p>
              <p className="text-xs mt-1">Configure templates clicando na ⚙️ nas ações</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-3">
                {template.blocks
                  .sort((a, b) => a.order - b.order)
                  .map((block) => renderBlock(block))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
