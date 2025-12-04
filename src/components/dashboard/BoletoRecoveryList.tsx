import { useMemo, useState } from "react";
import { Transaction } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  Phone,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useWhatsAppExtension } from "@/hooks/useWhatsAppExtension";
import { getGreeting } from "@/lib/greeting";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface BoletoRecoveryListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

interface GroupedBoletos {
  label: string;
  description: string;
  boletos: Transaction[];
  variant: "warning" | "destructive" | "default" | "secondary";
  priority: number;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export function BoletoRecoveryList({ transactions, isLoading }: BoletoRecoveryListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "hoje": true,
    "ontem": true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { sendText, extensionStatus } = useWhatsAppExtension();

  // Fetch default recovery template
  const { data: defaultTemplate } = useQuery({
    queryKey: ["default-boleto-template"],
    queryFn: async () => {
      const { data } = await supabase
        .from("boleto_recovery_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();
      
      if (data?.blocks) {
        const blocks = data.blocks as Array<{ type: string; content: string }>;
        const textBlock = blocks.find(b => b.type === "text");
        return textBlock?.content || null;
      }
      return null;
    },
  });

  // Filter only unpaid boletos (status = 'gerado')
  const unpaidBoletos = useMemo(() => {
    return transactions.filter(
      (t) => t.type === "boleto" && t.status === "gerado"
    );
  }, [transactions]);

  // Group boletos by age
  const groupedBoletos = useMemo(() => {
    const now = new Date();
    const groups: GroupedBoletos[] = [];

    const today: Transaction[] = [];
    const yesterday: Transaction[] = [];
    const twoDays: Transaction[] = [];
    const threeDays: Transaction[] = [];
    const fourPlusDays: Transaction[] = [];

    unpaidBoletos.forEach((boleto) => {
      const createdAt = new Date(boleto.created_at);
      const daysDiff = differenceInDays(now, createdAt);

      if (daysDiff === 0) {
        today.push(boleto);
      } else if (daysDiff === 1) {
        yesterday.push(boleto);
      } else if (daysDiff === 2) {
        twoDays.push(boleto);
      } else if (daysDiff === 3) {
        threeDays.push(boleto);
      } else {
        fourPlusDays.push(boleto);
      }
    });

    if (today.length > 0) {
      groups.push({
        label: "Hoje",
        description: "Boletos gerados hoje",
        boletos: today,
        variant: "default",
        priority: 1,
      });
    }

    if (yesterday.length > 0) {
      groups.push({
        label: "Ontem",
        description: "Aguardando pagamento há 1 dia",
        boletos: yesterday,
        variant: "secondary",
        priority: 2,
      });
    }

    if (twoDays.length > 0) {
      groups.push({
        label: "2 dias",
        description: "Aguardando pagamento há 2 dias",
        boletos: twoDays,
        variant: "warning",
        priority: 3,
      });
    }

    if (threeDays.length > 0) {
      groups.push({
        label: "3 dias",
        description: "Aguardando pagamento há 3 dias",
        boletos: threeDays,
        variant: "warning",
        priority: 4,
      });
    }

    if (fourPlusDays.length > 0) {
      groups.push({
        label: "4+ dias",
        description: "Aguardando pagamento há 4 ou mais dias",
        boletos: fourPlusDays,
        variant: "destructive",
        priority: 5,
      });
    }

    return groups;
  }, [unpaidBoletos]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [label.toLowerCase()]: !prev[label.toLowerCase()],
    }));
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const hours = differenceInHours(now, created);
    const days = differenceInDays(now, created);

    if (days > 0) {
      return `${days}d atrás`;
    }
    return `${hours}h atrás`;
  };

  const formatMessage = (template: string, boleto: Transaction) => {
    const firstName = boleto.customer_name?.split(" ")[0] || "";
    const metadata = boleto.metadata as Record<string, unknown> | null;
    const dueDate = metadata?.due_date as string | null;
    
    return template
      .replace(/{saudação}/g, getGreeting())
      .replace(/{saudacao}/g, getGreeting())
      .replace(/{nome}/g, boleto.customer_name || "")
      .replace(/{primeiro_nome}/g, firstName)
      .replace(/{valor}/g, formatAmount(Number(boleto.amount)))
      .replace(/{vencimento}/g, dueDate || "")
      .replace(/{codigo_barras}/g, boleto.external_id || "");
  };

  const handleCopyBarcode = async (barcode: string, id: string) => {
    await navigator.clipboard.writeText(barcode);
    setCopiedId(id);
    toast.success("Código de barras copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = async (boleto: Transaction) => {
    if (!boleto.customer_phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }

    if (extensionStatus !== "connected") {
      toast.error("Extensão WhatsApp não detectada");
      return;
    }

    const message = defaultTemplate 
      ? formatMessage(defaultTemplate, boleto)
      : `${getGreeting()}, ${boleto.customer_name?.split(" ")[0]}! Seu boleto no valor de ${formatAmount(Number(boleto.amount))} está disponível. Código de barras: ${boleto.external_id}`;

    const phone = boleto.customer_phone.replace(/\D/g, "");
    const success = await sendText(phone, message);

    if (success) {
      toast.success("Mensagem enviada para o WhatsApp");
    } else {
      toast.error("Erro ao enviar mensagem");
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boletos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unpaidBoletos.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boletos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="font-medium text-foreground mb-1">Nenhum boleto pendente</h3>
            <p className="text-sm text-muted-foreground">
              Todos os boletos foram pagos ou não há boletos gerados
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recuperação de Boletos
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {unpaidBoletos.length} pendente{unpaidBoletos.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Acompanhe e recupere boletos não pagos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {groupedBoletos.map((group) => {
          const isExpanded = expandedGroups[group.label.toLowerCase()] ?? false;
          
          return (
            <div key={group.label} className="rounded-lg border border-border/50 overflow-hidden">
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full flex items-center justify-between p-3 transition-colors",
                  group.variant === "destructive" && "bg-destructive/10 hover:bg-destructive/15",
                  group.variant === "warning" && "bg-warning/10 hover:bg-warning/15",
                  group.variant === "default" && "bg-secondary/30 hover:bg-secondary/50",
                  group.variant === "secondary" && "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {group.variant === "destructive" ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : group.variant === "warning" ? (
                    <Clock className="h-4 w-4 text-warning" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="text-left">
                    <span className="font-medium text-sm">{group.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({group.boletos.length} boleto{group.boletos.length > 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <ScrollArea className="max-h-[300px]">
                  <div className="divide-y divide-border/30">
                    {group.boletos.map((boleto) => (
                      <div
                        key={boleto.id}
                        className="p-3 hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">
                                {boleto.customer_name || "Cliente não identificado"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(boleto.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {boleto.customer_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {boleto.customer_phone}
                                </span>
                              )}
                            </div>
                            {boleto.external_id && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <code className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-mono truncate max-w-[180px]">
                                  {boleto.external_id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleCopyBarcode(boleto.external_id!, boleto.id)}
                                >
                                  {copiedId === boleto.id ? (
                                    <Check className="h-3 w-3 text-success" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="font-semibold text-sm text-primary">
                              {formatAmount(Number(boleto.amount))}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs hover:text-success hover:bg-success/10"
                              onClick={() => handleSendWhatsApp(boleto)}
                              disabled={!boleto.customer_phone}
                            >
                              <WhatsAppIcon className="h-3.5 w-3.5 mr-1" />
                              Recuperar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}