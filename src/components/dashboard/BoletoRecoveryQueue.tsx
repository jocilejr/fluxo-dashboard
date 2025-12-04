import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BoletoWithRecovery } from "@/hooks/useBoletoRecovery";
import { useWhatsAppExtension } from "@/hooks/useWhatsAppExtension";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquare,
  Phone,
  Copy,
  CheckCircle2,
  SkipForward,
  X,
  User,
  Calendar,
  DollarSign,
  Barcode,
  AlertCircle,
  FileText,
} from "lucide-react";

interface BoletoRecoveryQueueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boletos: BoletoWithRecovery[];
  onMarkContacted: (transactionId: string, ruleId?: string, notes?: string) => void;
}

export function BoletoRecoveryQueue({
  open,
  onOpenChange,
  boletos,
  onMarkContacted,
}: BoletoRecoveryQueueProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const { extensionStatus, openChat, sendText, fallbackOpenWhatsApp } = useWhatsAppExtension();

  // Reset index when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setNotes("");
    }
  }, [open]);

  // Safe index to prevent out of bounds
  const safeIndex = currentIndex >= boletos.length ? 0 : currentIndex;
  const currentBoleto = boletos.length > 0 ? boletos[safeIndex] : null;
  const progress = boletos.length > 0 ? ((safeIndex) / boletos.length) * 100 : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, "").replace(/^0+/, "");
  };

  const handleCopyMessage = useCallback(() => {
    if (currentBoleto?.formattedMessage) {
      navigator.clipboard.writeText(currentBoleto.formattedMessage);
      toast({ title: "Copiado!", description: "Mensagem copiada para a área de transferência" });
    }
  }, [currentBoleto, toast]);

  const handleSendWhatsApp = useCallback(async () => {
    if (!currentBoleto?.customer_phone) {
      toast({ title: "Erro", description: "Telefone não disponível", variant: "destructive" });
      return;
    }

    const phone = normalizePhone(currentBoleto.customer_phone);

    if (extensionStatus === "connected") {
      try {
        await openChat(phone);
        if (currentBoleto.formattedMessage) {
          await sendText(phone, currentBoleto.formattedMessage);
        }
      } catch (error) {
        fallbackOpenWhatsApp(phone, currentBoleto.formattedMessage || "");
      }
    } else {
      fallbackOpenWhatsApp(phone, currentBoleto.formattedMessage || "");
    }
  }, [currentBoleto, extensionStatus, openChat, sendText, fallbackOpenWhatsApp, toast]);

  const handleMarkContacted = useCallback(() => {
    if (!currentBoleto) return;
    
    onMarkContacted(
      currentBoleto.id,
      currentBoleto.applicableRule?.id,
      notes || undefined
    );
    
    setNotes("");
    
    if (safeIndex < boletos.length - 1) {
      setCurrentIndex(safeIndex + 1);
    } else {
      onOpenChange(false);
      toast({ title: "Parabéns!", description: "Você concluiu a recuperação de hoje! 🎉" });
    }
  }, [currentBoleto, safeIndex, boletos.length, notes, onMarkContacted, onOpenChange, toast]);

  const handleSkip = useCallback(() => {
    if (safeIndex < boletos.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setNotes("");
    } else {
      onOpenChange(false);
    }
  }, [safeIndex, boletos.length, onOpenChange]);

  const handleClose = () => {
    setCurrentIndex(0);
    setNotes("");
    onOpenChange(false);
  };

  if (!currentBoleto) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modo Recuperação</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <p className="text-lg font-medium">Nenhum boleto para recuperar hoje!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Volte amanhã ou configure novas regras na régua de cobrança.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Modo Recuperação
            </DialogTitle>
            <Badge variant="outline">
              {safeIndex + 1} / {boletos.length}
            </Badge>
          </div>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% concluído
          </p>
        </div>

        {/* Customer Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{currentBoleto.customer_name || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{currentBoleto.customer_phone || "Sem telefone"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium">{formatCurrency(currentBoleto.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Gerado em:</span>
                <span className="font-medium">
                  {format(new Date(currentBoleto.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">
                  {format(currentBoleto.dueDate, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>

            {currentBoleto.external_id && (
              <div className="flex items-center gap-2 text-sm">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Código:</span>
                <span className="font-mono text-xs truncate flex-1">{currentBoleto.external_id}</span>
              </div>
            )}

            {/* Status badges and Boleto Link */}
            <div className="flex flex-wrap items-center gap-2">
              {currentBoleto.applicableRule && (
                <Badge variant="secondary">{currentBoleto.applicableRule.name}</Badge>
              )}
              {currentBoleto.isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Vencido
                </Badge>
              )}
              {(currentBoleto.metadata as any)?.boleto_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 ml-auto"
                  onClick={() => window.open((currentBoleto.metadata as any).boleto_url, "_blank")}
                >
                  <FileText className="h-4 w-4" />
                  Ver Boleto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Preview */}
        {currentBoleto.formattedMessage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Mensagem</span>
              <Button variant="ghost" size="sm" onClick={handleCopyMessage} className="gap-1">
                <Copy className="h-3 w-3" />
                Copiar
              </Button>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border text-sm whitespace-pre-wrap">
              {currentBoleto.formattedMessage}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Observações (opcional)</span>
          <Textarea
            placeholder="Adicione notas sobre o contato..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={handleSendWhatsApp} className="flex-1 gap-2" disabled={!currentBoleto.customer_phone}>
            <Phone className="h-4 w-4" />
            Enviar WhatsApp
          </Button>
          <Button onClick={handleMarkContacted} variant="secondary" className="flex-1 gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Marcar Contactado
          </Button>
          <Button onClick={handleSkip} variant="ghost" className="gap-2">
            <SkipForward className="h-4 w-4" />
            Pular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
