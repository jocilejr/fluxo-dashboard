import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Settings, Play, CheckCircle2, Clock, DollarSign } from "lucide-react";

interface BoletoRecoveryHeroCardProps {
  todayCount: number;
  todayValue: number;
  contactedToday: number;
  remainingToContact: number;
  onStartRecovery: () => void;
  onOpenSettings: () => void;
}

export function BoletoRecoveryHeroCard({
  todayCount,
  todayValue,
  contactedToday,
  remainingToContact,
  onStartRecovery,
  onOpenSettings,
}: BoletoRecoveryHeroCardProps) {
  const progress = todayCount > 0 ? (contactedToday / todayCount) * 100 : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <CardContent className="relative p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Title and Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Recuperação de Hoje</h2>
                <p className="text-sm text-muted-foreground">
                  {remainingToContact > 0 
                    ? `${remainingToContact} boleto${remainingToContact > 1 ? "s" : ""} aguardando contato`
                    : "Todos os contatos realizados! 🎉"}
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border/50">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor a recuperar</p>
                  <p className="font-semibold text-foreground">{formatCurrency(todayValue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border/50">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Contactados</p>
                  <p className="font-semibold text-foreground">{contactedToday} / {todayCount}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {todayCount > 0 && (
              <div className="space-y-2 max-w-md">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso de hoje</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onStartRecovery}
              disabled={remainingToContact === 0}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              Iniciar Recuperação
            </Button>
            <Button
              onClick={onOpenSettings}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar Régua
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
