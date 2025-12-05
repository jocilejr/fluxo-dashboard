import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Banknote,
  Barcode,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
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
  const { extensionStatus, sendText } = useWhatsAppExtension();

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const safeIndex = currentIndex >= boletos.length ? 0 : currentIndex;
  const currentBoleto = boletos.length > 0 ? boletos[safeIndex] : null;
  const progress = boletos.length > 0 ? ((safeIndex) / boletos.length) * 100 : 0;
  const remaining = boletos.length - safeIndex;

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

    if (extensionStatus !== "connected") {
      toast({ title: "Erro", description: "Extensão WhatsApp não detectada", variant: "destructive" });
      return;
    }

    const phone = normalizePhone(currentBoleto.customer_phone);
    const success = await sendText(phone, currentBoleto.formattedMessage || "");

    if (success) {
      toast({ title: "Sucesso", description: "Mensagem preparada no WhatsApp" });
    } else {
      toast({ title: "Erro", description: "Erro ao preparar mensagem", variant: "destructive" });
    }
  }, [currentBoleto, extensionStatus, sendText, toast]);

  const handleMarkContacted = useCallback(() => {
    if (!currentBoleto) return;
    
    onMarkContacted(
      currentBoleto.id,
      currentBoleto.applicableRule?.id,
      undefined
    );
    
    if (safeIndex < boletos.length - 1) {
      setCurrentIndex(safeIndex + 1);
    } else {
      onOpenChange(false);
      toast({ title: "Parabéns!", description: "Você concluiu a recuperação de hoje! 🎉" });
    }
  }, [currentBoleto, safeIndex, boletos.length, onMarkContacted, onOpenChange, toast]);

  const handleSkip = useCallback(() => {
    if (safeIndex < boletos.length - 1) {
      setCurrentIndex(safeIndex + 1);
    } else {
      onOpenChange(false);
    }
  }, [safeIndex, boletos.length, onOpenChange]);

  const handleClose = () => {
    setCurrentIndex(0);
    onOpenChange(false);
  };

  if (!currentBoleto) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md border-0 bg-gradient-to-b from-card to-background p-0 overflow-hidden">
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Tudo em dia!</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Nenhum boleto para recuperar no momento. Configure novas regras na régua de cobrança.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-0 bg-gradient-to-b from-card to-background p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Modo Recuperação</h2>
                <p className="text-xs text-muted-foreground">Fila de contatos pendentes</p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs px-3 py-1">
              {safeIndex + 1} de {boletos.length}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {remaining} {remaining === 1 ? 'contato restante' : 'contatos restantes'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Customer Card */}
          <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
            <div className="p-4 border-b border-border/30 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {currentBoleto.customer_name || "Cliente não identificado"}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {currentBoleto.customer_phone || "Sem telefone"}
                </p>
              </div>
              {currentBoleto.isOverdue && (
                <Badge variant="destructive" className="gap-1 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Vencido
                </Badge>
              )}
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor</p>
                <p className="font-semibold text-primary">{formatCurrency(currentBoleto.amount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Gerado em</p>
                <p className="font-medium text-sm">
                  {format(new Date(currentBoleto.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Vencimento</p>
                <p className="font-medium text-sm">
                  {format(currentBoleto.dueDate, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Regra</p>
                <p className="font-medium text-sm truncate">
                  {currentBoleto.applicableRule?.name || "—"}
                </p>
              </div>
            </div>

            {currentBoleto.external_id && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50 border border-border/30">
                  <Barcode className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-mono text-xs truncate text-muted-foreground">
                    {currentBoleto.external_id}
                  </span>
                  {(currentBoleto.metadata as any)?.boleto_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 text-xs gap-1.5 shrink-0"
                      onClick={() => window.open((currentBoleto.metadata as any).boleto_url, "_blank")}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ver Boleto
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message Preview */}
          {currentBoleto.formattedMessage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Mensagem de Recuperação
                </h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopyMessage} 
                  className="h-7 text-xs gap-1.5 hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 text-sm leading-relaxed whitespace-pre-wrap">
                {currentBoleto.formattedMessage}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 border-t border-border/50 bg-muted/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSendWhatsApp} 
              className="flex-1 gap-2 h-11 font-medium" 
              disabled={!currentBoleto.customer_phone}
            >
              <Phone className="h-4 w-4" />
              Enviar WhatsApp
            </Button>
            <Button 
              onClick={handleMarkContacted} 
              variant="secondary" 
              className="flex-1 gap-2 h-11 font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar Contactado
            </Button>
            <Button 
              onClick={handleSkip} 
              variant="ghost" 
              className="sm:w-auto gap-2 h-11"
            >
              <SkipForward className="h-4 w-4" />
              Pular
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
