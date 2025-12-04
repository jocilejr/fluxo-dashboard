import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Trophy, RefreshCw, ArrowLeft, Filter } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateFilter = "today" | "yesterday" | "week" | "month";

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
      default:
        return { from: today, to: todayEnd };
    }
  };

  const dateRange = getDateRange();

  // Fetch list of typebots for the selector
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
    queryKey: ["typebot-ranking", dateFilter, selectedTypebot],
    queryFn: async () => {
      // Send timezone offset to backend for accurate date filtering
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

  const filterButtons = [
    { key: "today" as DateFilter, label: "Hoje" },
    { key: "yesterday" as DateFilter, label: "Ontem" },
    { key: "week" as DateFilter, label: "Semana" },
    { key: "month" as DateFilter, label: "Mês" },
  ];

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Ranking de Typebots</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="ml-auto"
          >
            <RefreshCw className={`h-5 w-5 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4 space-y-4">
            {/* Typebot Selector */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedTypebot} onValueChange={setSelectedTypebot}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Selecionar typebot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Typebots</SelectItem>
                  {typebotList?.map((typebot) => (
                    <SelectItem key={typebot.id} value={typebot.id}>
                      {typebot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap gap-2">
              {filterButtons.map((btn) => (
                <Button
                  key={btn.key}
                  variant={dateFilter === btn.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilter(btn.key)}
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-3">
              Período: {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
              {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        {/* Ranking List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 10 Typebots por Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Erro ao carregar ranking</p>
                <Button variant="link" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : ranking && ranking.length > 0 ? (
              <div className="space-y-2">
                {ranking.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`text-2xl font-bold w-8 ${getMedalColor(index)}`}>
                      {index + 1}º
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{item.count}</p>
                      <p className="text-xs text-muted-foreground">leads</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum lead encontrado no período selecionado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
