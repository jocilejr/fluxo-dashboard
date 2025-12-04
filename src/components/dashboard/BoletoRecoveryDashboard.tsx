import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "@/hooks/useTransactions";
import { useBoletoRecovery, BoletoWithRecovery } from "@/hooks/useBoletoRecovery";
import { BoletoRecoveryHeroCard } from "./BoletoRecoveryHeroCard";
import { BoletoRecoveryRulesConfig } from "./BoletoRecoveryRulesConfig";
import { BoletoRecoveryQueue } from "./BoletoRecoveryQueue";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  CalendarClock,
  AlertTriangle,
  Phone,
  Copy,
  CheckCircle2,
  MessageSquare,
  User,
  DollarSign,
  Barcode,
} from "lucide-react";

interface BoletoRecoveryDashboardProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function BoletoRecoveryDashboard({ transactions, isLoading }: BoletoRecoveryDashboardProps) {
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [selectedBoleto, setSelectedBoleto] = useState<BoletoWithRecovery | null>(null);

  const {
    todayBoletos,
    pendingBoletos,
    overdueBoletos,
    stats,
    addContact,
  } = useBoletoRecovery(transactions);

  const handleMarkContacted = (transactionId: string, ruleId?: string, notes?: string) => {
    addContact.mutate(
      { transactionId, ruleId, notes },
      {
        onSuccess: () => {
          toast({ title: "Sucesso", description: "Contato registrado" });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível registrar", variant: "destructive" });
        },
      }
    );
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <BoletoRecoveryHeroCard
        todayCount={stats.todayCount}
        todayValue={stats.todayValue}
        contactedToday={stats.contactedToday}
        onStartRecovery={() => setQueueOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Tabs */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="today" className="gap-2">
            <Clock className="h-4 w-4" />
            Hoje
            {stats.remainingToContact > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.remainingToContact}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Pendentes
            {stats.pendingCount > 0 && (
              <Badge variant="outline" className="ml-1 h-5 px-1.5">
                {stats.pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Vencidos
            {stats.overdueCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {stats.overdueCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <BoletoList
            boletos={todayBoletos}
            emptyMessage="Nenhum boleto para contatar hoje"
            emptyIcon={<CheckCircle2 className="h-12 w-12 text-success" />}
            onSelect={setSelectedBoleto}
            onMarkContacted={handleMarkContacted}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <BoletoList
            boletos={pendingBoletos}
            emptyMessage="Nenhum boleto pendente"
            emptyIcon={<CalendarClock className="h-12 w-12 text-muted-foreground" />}
            onSelect={setSelectedBoleto}
            onMarkContacted={handleMarkContacted}
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <BoletoList
            boletos={overdueBoletos}
            emptyMessage="Nenhum boleto vencido"
            emptyIcon={<AlertTriangle className="h-12 w-12 text-muted-foreground" />}
            onSelect={setSelectedBoleto}
            onMarkContacted={handleMarkContacted}
            showOverdueWarning
          />
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Régua de Cobrança</DialogTitle>
          </DialogHeader>
          <BoletoRecoveryRulesConfig />
        </DialogContent>
      </Dialog>

      {/* Recovery Queue Dialog */}
      <BoletoRecoveryQueue
        open={queueOpen}
        onOpenChange={setQueueOpen}
        boletos={todayBoletos}
        onMarkContacted={handleMarkContacted}
      />

      {/* Boleto Detail Dialog */}
      {selectedBoleto && (
        <BoletoDetailDialog
          boleto={selectedBoleto}
          onClose={() => setSelectedBoleto(null)}
          onMarkContacted={handleMarkContacted}
        />
      )}
    </div>
  );
}

// Boleto List Component
interface BoletoListProps {
  boletos: BoletoWithRecovery[];
  emptyMessage: string;
  emptyIcon: React.ReactNode;
  onSelect: (boleto: BoletoWithRecovery) => void;
  onMarkContacted: (transactionId: string, ruleId?: string) => void;
  showOverdueWarning?: boolean;
}

function BoletoList({
  boletos,
  emptyMessage,
  emptyIcon,
  onSelect,
  onMarkContacted,
  showOverdueWarning,
}: BoletoListProps) {
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    toast({ title: "Copiado!", description: "Código de barras copiado" });
  };

  const handleWhatsApp = (phone: string, message?: string) => {
    const normalizedPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
    const url = message
      ? `https://wa.me/55${normalizedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/55${normalizedPhone}`;
    window.open(url, "_blank");
  };

  if (boletos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {emptyIcon}
          <p className="text-muted-foreground mt-4">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ScrollArea className="h-[500px]">
        <div className="p-4 space-y-3">
          {boletos.map((boleto) => (
            <Card
              key={boleto.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                showOverdueWarning ? "border-destructive/30" : ""
              }`}
              onClick={() => onSelect(boleto)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Customer Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{boleto.customer_name || "Cliente"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatCurrency(boleto.amount)}</span>
                        <span>•</span>
                        <span>
                          {boleto.isOverdue
                            ? `Vencido há ${Math.abs(boleto.daysUntilDue)} dia${Math.abs(boleto.daysUntilDue) > 1 ? "s" : ""}`
                            : boleto.daysUntilDue === 0
                            ? "Vence hoje"
                            : `Vence em ${boleto.daysUntilDue} dia${boleto.daysUntilDue > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges and Actions */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {boleto.applicableRule && (
                      <Badge variant="secondary" className="text-xs">
                        {boleto.applicableRule.name}
                      </Badge>
                    )}
                    {boleto.contacts.length > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {boleto.contacts.length}x
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      {boleto.external_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyBarcode(boleto.external_id!);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {boleto.customer_phone && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsApp(boleto.customer_phone!, boleto.formattedMessage || undefined);
                          }}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// Boleto Detail Dialog
interface BoletoDetailDialogProps {
  boleto: BoletoWithRecovery;
  onClose: () => void;
  onMarkContacted: (transactionId: string, ruleId?: string) => void;
}

function BoletoDetailDialog({ boleto, onClose, onMarkContacted }: BoletoDetailDialogProps) {
  const { toast } = useToast();

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleCopyMessage = () => {
    if (boleto.formattedMessage) {
      navigator.clipboard.writeText(boleto.formattedMessage);
      toast({ title: "Copiado!", description: "Mensagem copiada" });
    }
  };

  const handleWhatsApp = () => {
    if (!boleto.customer_phone) return;
    const phone = boleto.customer_phone.replace(/\D/g, "").replace(/^0+/, "");
    const url = boleto.formattedMessage
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(boleto.formattedMessage)}`
      : `https://wa.me/55${phone}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {boleto.customer_name || "Cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{boleto.customer_phone || "Sem telefone"}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatCurrency(boleto.amount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Gerado {formatDistanceToNow(new Date(boleto.created_at), { locale: ptBR, addSuffix: true })}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span>Vence {format(boleto.dueDate, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          {/* Barcode */}
          {boleto.external_id && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Código de barras</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(boleto.external_id!);
                    toast({ title: "Copiado!" });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-mono text-xs break-all">{boleto.external_id}</p>
            </div>
          )}

          {/* Message */}
          {boleto.formattedMessage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mensagem</span>
                <Button variant="ghost" size="sm" onClick={handleCopyMessage}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap border">
                {boleto.formattedMessage}
              </div>
            </div>
          )}

          {/* Contact History */}
          {boleto.contacts.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Histórico de contatos</span>
              <div className="space-y-1">
                {boleto.contacts.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    <span>
                      {format(new Date(contact.contacted_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                    {contact.notes && <span>- {contact.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleWhatsApp} className="flex-1 gap-2" disabled={!boleto.customer_phone}>
              <Phone className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              variant="secondary"
              className="flex-1 gap-2"
              onClick={() => {
                onMarkContacted(boleto.id, boleto.applicableRule?.id);
                onClose();
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar Contactado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
