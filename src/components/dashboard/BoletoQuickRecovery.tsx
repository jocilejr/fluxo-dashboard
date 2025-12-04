import { useState, useEffect, useRef } from "react";
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
  Barcode,
  Download,
  Loader2,
  GripHorizontal
} from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const pdfLinkRef = useRef<HTMLAnchorElement>(null);
  const imageLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (open) {
      fetchDefaultTemplate();
      if (transaction) {
        loadPdfAndConvert();
      }
    } else {
      // Cleanup on close
      setPdfBlob(null);
      if (pdfImageUrl) {
        URL.revokeObjectURL(pdfImageUrl);
        setPdfImageUrl(null);
      }
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

  const loadPdfAndConvert = async () => {
    const metadata = transaction?.metadata as Record<string, unknown> | null;
    const boletoUrl = metadata?.boleto_url as string | undefined;

    if (!boletoUrl) return;

    setIsLoadingPdf(true);
    try {
      // Fetch PDF via proxy to avoid CORS/blocking issues
      const { data: proxyData, error } = await supabase.functions.invoke("pdf-proxy", {
        body: { url: boletoUrl },
      });

      if (error) throw error;

      // Convert base64 to blob
      const binaryString = atob(proxyData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlobData = new Blob([bytes], { type: "application/pdf" });
      setPdfBlob(pdfBlobData);

      // Convert PDF to image using PDF.js
      const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdfDoc.getPage(1);
      
      const scale = 2; // Higher quality
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not get canvas context");

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setPdfImageUrl(imageUrl);
        }
      }, "image/jpeg", 0.95);

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
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `boleto-${transaction?.customer_name || "cliente"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadImage = () => {
    if (pdfImageUrl) {
      const a = document.createElement("a");
      a.href = pdfImageUrl;
      a.download = `boleto-${transaction?.customer_name || "cliente"}.jpg`;
      a.click();
    }
  };

  const handleDragStart = (e: React.DragEvent, type: "pdf" | "image") => {
    if (type === "pdf" && pdfBlob) {
      e.dataTransfer.setData("application/pdf", "boleto.pdf");
      e.dataTransfer.effectAllowed = "copy";
    } else if (type === "image" && pdfImageUrl) {
      e.dataTransfer.setData("text/uri-list", pdfImageUrl);
      e.dataTransfer.effectAllowed = "copy";
    }
  };

  if (!transaction) return null;

  const metadata = transaction.metadata as Record<string, unknown> | null;
  const hasBoletoUrl = !!metadata?.boleto_url;

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

        {/* Draggable files section */}
        {hasBoletoUrl && (
          <div className="mb-4 p-4 rounded-lg bg-secondary/20 border border-border/30">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <GripHorizontal className="h-4 w-4" />
              Arquivos para arrastar
            </h4>
            
            {isLoadingPdf ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando boleto...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* PDF File */}
                <div
                  draggable={!!pdfBlob}
                  onDragStart={(e) => handleDragStart(e, "pdf")}
                  className={`p-4 rounded-lg border-2 border-dashed transition-all ${
                    pdfBlob 
                      ? "border-primary/50 bg-primary/5 cursor-grab hover:border-primary hover:bg-primary/10 active:cursor-grabbing" 
                      : "border-border/30 bg-secondary/10 opacity-50"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <FileText className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium">PDF do Boleto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pdfBlob ? "Arraste para o WhatsApp" : "Indisponível"}
                    </p>
                    {pdfBlob && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={handleDownloadPdf}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Image File */}
                <div
                  draggable={!!pdfImageUrl}
                  onDragStart={(e) => handleDragStart(e, "image")}
                  className={`p-4 rounded-lg border-2 border-dashed transition-all ${
                    pdfImageUrl 
                      ? "border-success/50 bg-success/5 cursor-grab hover:border-success hover:bg-success/10 active:cursor-grabbing" 
                      : "border-border/30 bg-secondary/10 opacity-50"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <ImageIcon className="h-10 w-10 text-success mb-2" />
                    <p className="text-sm font-medium">Imagem do Boleto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pdfImageUrl ? "Arraste para o WhatsApp" : "Convertendo..."}
                    </p>
                    {pdfImageUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={handleDownloadImage}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            {pdfImageUrl && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Prévia da imagem:</p>
                <img 
                  src={pdfImageUrl} 
                  alt="Boleto" 
                  className="w-full max-h-[150px] object-contain rounded border border-border/30"
                  draggable
                  onDragStart={(e) => handleDragStart(e, "image")}
                />
              </div>
            )}
          </div>
        )}

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
              <p className="text-xs mt-1">Configure templates nas ações da tabela (⚙️)</p>
            </div>
          ) : (
            <ScrollArea className="h-[180px]">
              <div className="space-y-3 pr-4">
                {template.blocks
                  .filter(block => block.type === "text")
                  .sort((a, b) => a.order - b.order)
                  .map((block) => {
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
                  })}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
