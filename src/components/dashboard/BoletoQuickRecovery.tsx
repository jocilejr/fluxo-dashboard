import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  ExternalLink,
  DollarSign,
  Calendar
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
        .maybeSingle();

      if (error) throw error;

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
          .maybeSingle();

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

    const fullName = transaction.customer_name || "Cliente";
    const firstName = fullName.split(" ")[0];

    return text
      .replace(/{nome}/g, fullName)
      .replace(/{primeiro_nome}/g, firstName)
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
  const dueDate = metadata?.due_date ? formatDate(String(metadata.due_date)) : null;

  const renderBlock = (block: RecoveryBlock) => {
    if (block.type === "text") {
      const processedText = replaceVariables(block.content);
      return (
        <div key={block.id} className="p-2 rounded-lg bg-secondary/30 border border-border/30 flex items-start gap-3">
          <p className="text-xs whitespace-pre-wrap leading-relaxed flex-1">{processedText}</p>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 h-7 px-2 gap-1"
            onClick={() => handleCopy(block.content, block.id)}
          >
            {copiedId === block.id ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      );
    }

    if (block.type === "pdf") {
      return (
        <div key={block.id} className="p-2 rounded-lg bg-primary/5 border border-primary/30 flex items-center gap-3">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium flex-1">PDF do Boleto</span>
          {isLoadingPdf ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : pdfBlobUrl ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleOpenPdfInNewTab}>
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleDownloadPdf}>
                <Download className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">Indisponível</span>
          )}
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div key={block.id} className="p-2 rounded-lg bg-success/5 border border-success/30 flex items-center gap-3">
          <ImageIcon className="h-4 w-4 text-success shrink-0" />
          <span className="text-xs font-medium flex-1">Imagem do Boleto</span>
          {pdfBlobUrl ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={handleOpenPdfInNewTab}>
              <ExternalLink className="h-3 w-3" />
              <span className="text-[10px]">Print</span>
            </Button>
          ) : (
            <span className="text-[10px] text-muted-foreground">Aguardando...</span>
          )}
        </div>
      );
    }

    return null;
  };

  const InfoItem = ({ 
    icon: Icon, 
    label, 
    value, 
    fieldId,
    highlight = false,
    mono = false
  }: { 
    icon: typeof User; 
    label: string; 
    value: string | null; 
    fieldId: string;
    highlight?: boolean;
    mono?: boolean;
  }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border/30'}`}>
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      <span className={`text-xs ${highlight ? 'font-bold text-primary' : 'font-medium'} ${mono ? 'font-mono' : ''} truncate`}>
        {value || "-"}
      </span>
      {value && (
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 shrink-0 ml-auto"
          onClick={() => handleCopyField(value, fieldId)}
        >
          {copiedId === fieldId ? (
            <Check className="h-2.5 w-2.5 text-success" />
          ) : (
            <Copy className="h-2.5 w-2.5" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-border/30">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            Recuperação de Boleto
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Top - Boleto Info in horizontal row */}
          <div className="flex flex-wrap gap-2">
            <InfoItem 
              icon={User} 
              label="Cliente" 
              value={transaction.customer_name} 
              fieldId="name" 
            />
            <InfoItem 
              icon={Phone} 
              label="Tel" 
              value={transaction.customer_phone} 
              fieldId="phone" 
            />
            <InfoItem 
              icon={DollarSign} 
              label="Valor" 
              value={formatCurrency(Number(transaction.amount))} 
              fieldId="value"
              highlight 
            />
            {dueDate && (
              <InfoItem 
                icon={Calendar} 
                label="Venc" 
                value={dueDate} 
                fieldId="dueDate" 
              />
            )}
          </div>
          
          {/* Barcode - full width compact */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-secondary/30 border border-border/30">
            <Barcode className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground">Código:</span>
            <span className="font-mono text-[10px] truncate flex-1">
              {transaction.external_id || "-"}
            </span>
            {transaction.external_id && (
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0"
                onClick={() => handleCopyField(transaction.external_id!, "barcode")}
              >
                {copiedId === "barcode" ? (
                  <Check className="h-2.5 w-2.5 text-success" />
                ) : (
                  <Copy className="h-2.5 w-2.5" />
                )}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Bottom - Recovery messages stacked */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Mensagens de Recuperação
            </h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : !template || template.blocks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground border border-dashed border-border/30 rounded">
                <p className="text-xs">Nenhum template configurado</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {template.blocks
                  .sort((a, b) => a.order - b.order)
                  .map((block) => renderBlock(block))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
