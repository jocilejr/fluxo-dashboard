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
  const dueDate = metadata?.due_date ? formatDate(String(metadata.due_date)) : null;

  const renderBlock = (block: RecoveryBlock) => {
    if (block.type === "text") {
      const processedText = replaceVariables(block.content);
      return (
        <div key={block.id} className="p-3 rounded-lg bg-secondary/30 border border-border/30">
          <p className="text-sm whitespace-pre-wrap leading-relaxed mb-2">{processedText}</p>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() => handleCopy(block.content, block.id)}
          >
            {copiedId === block.id ? (
              <>
                <Check className="h-4 w-4 text-success" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar mensagem
              </>
            )}
          </Button>
        </div>
      );
    }

    if (block.type === "pdf") {
      return (
        <div key={block.id} className="p-3 rounded-lg bg-primary/5 border border-primary/30">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">PDF do Boleto</span>
          </div>
          {isLoadingPdf ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs ml-2">Carregando...</span>
            </div>
          ) : pdfBlobUrl ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={handleOpenPdfInNewTab}>
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
              <Button size="sm" className="flex-1 gap-2" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">PDF indisponível</p>
          )}
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div key={block.id} className="p-3 rounded-lg bg-success/5 border border-success/30">
          <div className="flex items-center gap-3 mb-2">
            <ImageIcon className="h-5 w-5 text-success" />
            <span className="text-sm font-medium">Imagem do Boleto</span>
          </div>
          {pdfBlobUrl ? (
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleOpenPdfInNewTab}>
                <ExternalLink className="h-4 w-4" />
                Abrir PDF para print
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Use Win+Shift+S para capturar
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">Aguardando PDF...</p>
          )}
        </div>
      );
    }

    return null;
  };

  const InfoCard = ({ 
    icon: Icon, 
    label, 
    value, 
    fieldId,
    highlight = false 
  }: { 
    icon: typeof User; 
    label: string; 
    value: string | null; 
    fieldId: string;
    highlight?: boolean;
  }) => (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary/10 border-primary/30' : 'bg-secondary/30 border-border/30'}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm ${highlight ? 'font-bold text-primary' : 'font-medium'} truncate`}>
          {value || "-"}
        </p>
        {value && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={() => handleCopyField(value, fieldId)}
          >
            {copiedId === fieldId ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boleto
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6 p-6 overflow-hidden">
          {/* Left side - Boleto Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações do Boleto
            </h4>
            
            <div className="space-y-3">
              <InfoCard 
                icon={User} 
                label="Cliente" 
                value={transaction.customer_name} 
                fieldId="name" 
              />
              
              <InfoCard 
                icon={Phone} 
                label="Telefone" 
                value={transaction.customer_phone} 
                fieldId="phone" 
              />
              
              <InfoCard 
                icon={DollarSign} 
                label="Valor" 
                value={formatCurrency(Number(transaction.amount))} 
                fieldId="value"
                highlight 
              />
              
              {dueDate && (
                <InfoCard 
                  icon={Calendar} 
                  label="Vencimento" 
                  value={dueDate} 
                  fieldId="dueDate" 
                />
              )}
              
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Barcode className="h-3 w-3" />
                  <span>Código de Barras</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs break-all flex-1">
                    {transaction.external_id || "-"}
                  </p>
                  {transaction.external_id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleCopyField(transaction.external_id!, "barcode")}
                    >
                      {copiedId === "barcode" ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Recovery sequence */}
          <div className="space-y-4 mt-6 md:mt-0 border-t md:border-t-0 md:border-l border-border/30 pt-6 md:pt-0 md:pl-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Mensagens de Recuperação
            </h4>
            
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
              <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-3">
                  {template.blocks
                    .sort((a, b) => a.order - b.order)
                    .map((block) => renderBlock(block))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
