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
        <div key={block.id} className="group p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{processedText}</p>
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2 h-9"
              onClick={() => handleCopy(block.content, block.id)}
            >
              {copiedId === block.id ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-500">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar mensagem
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }

    if (block.type === "pdf") {
      return (
        <div key={block.id} className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">PDF do Boleto</p>
              <p className="text-xs text-muted-foreground">Arquivo para envio</p>
            </div>
          </div>
          {isLoadingPdf ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : pdfBlobUrl ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-2 h-9" onClick={handleOpenPdfInNewTab}>
                <ExternalLink className="h-4 w-4" />
                Visualizar
              </Button>
              <Button size="sm" className="flex-1 gap-2 h-9" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">PDF não disponível</p>
          )}
        </div>
      );
    }

    if (block.type === "image") {
      return (
        <div key={block.id} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <ImageIcon className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Imagem do Boleto</p>
              <p className="text-xs text-muted-foreground">Captura de tela</p>
            </div>
          </div>
          {pdfBlobUrl ? (
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full gap-2 h-9" onClick={handleOpenPdfInNewTab}>
                <ExternalLink className="h-4 w-4" />
                Abrir para captura
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Win+Shift+S</kbd> para capturar
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">Aguardando PDF...</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg">Recuperação de Boleto</span>
              <p className="text-sm font-normal text-muted-foreground">Copie as mensagens para enviar ao cliente</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-0">
          {/* Left side - Boleto Info */}
          <div className="p-6 bg-muted/20 border-b lg:border-b-0 lg:border-r border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Dados do Cliente
            </h4>
            
            <div className="space-y-3">
              {/* Cliente */}
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span>Nome do Cliente</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{transaction.customer_name || "-"}</p>
                  {transaction.customer_name && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyField(transaction.customer_name!, "name")}>
                      {copiedId === "name" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Telefone */}
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Telefone</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{transaction.customer_phone || "-"}</p>
                  {transaction.customer_phone && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyField(transaction.customer_phone!, "phone")}>
                      {copiedId === "phone" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* Valor - Destacado */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 text-xs text-primary/70 mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Valor do Boleto</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">{formatCurrency(Number(transaction.amount))}</p>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyField(formatCurrency(Number(transaction.amount)), "value")}>
                    {copiedId === "value" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Vencimento */}
              {dueDate && (
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Vencimento</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{dueDate}</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopyField(dueDate, "dueDate")}>
                      {copiedId === "dueDate" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Código de Barras */}
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Barcode className="h-3.5 w-3.5" />
                  <span>Código de Barras</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs text-foreground/80 break-all flex-1">{transaction.external_id || "-"}</p>
                  {transaction.external_id && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleCopyField(transaction.external_id!, "barcode")}>
                      {copiedId === "barcode" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Recovery messages */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Mensagens de Recuperação
            </h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Carregando template...</span>
              </div>
            ) : !template || template.blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum template configurado</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Configure templates nas configurações</p>
              </div>
            ) : (
              <div className="space-y-3">
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
