import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Users, PlayCircle, CheckCircle, Calendar, RefreshCw, X } from "lucide-react";

interface TypebotStatsProps {
  onClose: () => void;
}

interface TypebotStatsData {
  stats: {
    totalViews?: number;
    totalStarts?: number;
    totalCompleted?: number;
  };
  todayCount: number;
  totalResults: number;
}

export function TypebotStats({ onClose }: TypebotStatsProps) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery<TypebotStatsData>({
    queryKey: ["typebot-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("typebot-stats");
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minute
  });

  return (
    <Card className="mb-6 animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Estatísticas do Typebot
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-destructive">
            <p className="text-sm">Erro ao carregar estatísticas</p>
            <Button variant="link" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Hoje</span>
              </div>
              <p className="text-2xl font-bold text-primary">{data?.todayCount || 0}</p>
              <p className="text-xs text-muted-foreground">pessoas no funil</p>
            </div>

            <div className="p-4 rounded-lg bg-info/10 border border-info/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-info" />
                <span className="text-xs text-muted-foreground">Visualizações</span>
              </div>
              <p className="text-2xl font-bold text-info">{data?.stats?.totalViews || 0}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Iniciaram</span>
              </div>
              <p className="text-2xl font-bold text-warning">{data?.stats?.totalStarts || 0}</p>
              <p className="text-xs text-muted-foreground">conversas</p>
            </div>

            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Completaram</span>
              </div>
              <p className="text-2xl font-bold text-success">{data?.stats?.totalCompleted || 0}</p>
              <p className="text-xs text-muted-foreground">fluxos</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
