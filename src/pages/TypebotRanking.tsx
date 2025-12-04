import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Trophy, RefreshCw, ArrowLeft, CalendarIcon, Users, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

type DateFilter = "today" | "yesterday" | "week" | "month" | "custom";

interface TypebotRankItem {
  id: string;
  name: string;
  count: number;
}

interface TypebotListItem {
  id: string;
  name: string;
}

export default function TypebotRanking() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [selectedTypebot, setSelectedTypebot] = useState<string>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const getDateRange = () => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    
    switch (dateFilter) {
      case "today":
        return { from: today, to: todayEnd };
      case "yesterday":
        const yesterday = subDays(today, 1);
        return { from: yesterday, to: endOfDay(yesterday) };
      case "week":
        return { from: startOfWeek(now, { weekStartsOn: 0 }), to: todayEnd };
      case "month":
        return { from: startOfMonth(now), to: todayEnd };
      case "custom":
        return {
          from: customRange?.from ? startOfDay(customRange.from) : today,
          to: customRange?.to ? endOfDay(customRange.to) : todayEnd,
        };
      default:
        return { from: today, to: todayEnd };
    }
  };

  const dateRange = getDateRange();

  const { data: typebotList } = useQuery<TypebotListItem[]>({
    queryKey: ["typebot-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("typebot-stats", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data.typebots || [];
    },
    staleTime: 300000,
  });

  const { data: ranking, isLoading, error, refetch, isRefetching } = useQuery<TypebotRankItem[]>({
    queryKey: ["typebot-ranking", dateFilter, selectedTypebot, customRange?.from?.toISOString(), customRange?.to?.toISOString()],
    queryFn: async () => {
      const timezoneOffset = new Date().getTimezoneOffset();
      const { data, error } = await supabase.functions.invoke("typebot-stats", {
        body: {
          action: "ranking",
          fromDate: dateRange.from.toISOString(),
          toDate: dateRange.to.toISOString(),
          timezoneOffset,
          typebotId: selectedTypebot !== "all" ? selectedTypebot : undefined,
        },
      });
      if (error) throw error;
      return data.ranking || [];
    },
    staleTime: 60000,
  });

  const totalLeads = ranking?.reduce((sum, item) => sum + item.count, 0) || 0;
  const topTypebot = ranking?.[0];

  const filterButtons = [
    { key: "today" as DateFilter, label: "Hoje" },
    { key: "yesterday" as DateFilter, label: "Ontem" },
    { key: "week" as DateFilter, label: "Semana" },
    { key: "month" as DateFilter, label: "Mês" },
    { key: "custom" as DateFilter, label: "Personalizado" },
  ];

  const getMedalStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-950";
      case 1:
        return "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950";
      case 2:
        return "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-950";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Ranking de Typebots</h1>
                  <p className="text-xs text-muted-foreground">
                    {format(dateRange.from, "dd MMM", { locale: ptBR })} - {format(dateRange.to, "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                  <p className="text-3xl font-bold">{totalLeads.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 border-yellow-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Líder</p>
                  <p className="text-lg font-bold truncate">{topTypebot?.name || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leads do Líder</p>
                  <p className="text-3xl font-bold">{topTypebot?.count?.toLocaleString('pt-BR') || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Typebot Selector */}
              <Select value={selectedTypebot} onValueChange={setSelectedTypebot}>
                <SelectTrigger className="lg:w-[280px]">
                  <SelectValue placeholder="Selecionar typebot" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">Todos os Typebots</SelectItem>
                  {typebotList?.map((typebot) => (
                    <SelectItem key={typebot.id} value={typebot.id}>
                      {typebot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filters */}
              <div className="flex flex-wrap gap-2 flex-1">
                {filterButtons.map((btn) => (
                  <Button
                    key={btn.key}
                    variant={dateFilter === btn.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDateFilter(btn.key)}
                    className={cn(
                      "transition-all",
                      dateFilter === btn.key && "shadow-md"
                    )}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date Range */}
              {dateFilter === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 lg:w-auto w-full justify-start">
                      <CalendarIcon className="h-4 w-4" />
                      {customRange?.from ? (
                        customRange.to ? (
                          <>
                            {format(customRange.from, "dd/MM/yy", { locale: ptBR })} - {format(customRange.to, "dd/MM/yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(customRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        "Selecionar período"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customRange?.from}
                      selected={customRange}
                      onSelect={setCustomRange}
                      numberOfMonths={1}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ranking List */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Top 10 Typebots</h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-2">Erro ao carregar ranking</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : ranking && ranking.length > 0 ? (
              <div className="space-y-3">
                {ranking.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]",
                      index < 3 ? "bg-gradient-to-r from-muted/80 to-muted/40" : "bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      getMedalStyle(index)
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      {index < 3 && (
                        <p className="text-xs text-muted-foreground">
                          {index === 0 ? "🏆 Primeiro lugar" : index === 1 ? "🥈 Segundo lugar" : "🥉 Terceiro lugar"}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold tabular-nums">{item.count.toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">leads</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum lead encontrado no período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
