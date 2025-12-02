import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/hooks/useTransactions';
import { useMemo, useState } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { DateFilterValue } from './DateFilter';

interface RevenueChartProps {
  transactions: Transaction[];
  dateFilter: DateFilterValue;
}

type ChartPeriod = 'day' | 'week' | 'month' | 'year';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    return (
      <div className="glass-card rounded-lg p-3 border border-border/50">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name === 'boleto' ? 'Boleto' : entry.name === 'pix' ? 'PIX' : 'Cartão'}: R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ))}
        <p className="text-xs font-medium mt-2 pt-2 border-t border-border/50">
          Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ transactions, dateFilter }: RevenueChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>('day');

  const chartData = useMemo(() => {
    const filteredTransactions = transactions.filter((t) => {
      const date = new Date(t.created_at);
      return isWithinInterval(date, { start: dateFilter.startDate, end: dateFilter.endDate }) && t.status === 'pago';
    });

    const aggregateData = (
      intervals: Date[],
      getKey: (date: Date) => string,
      formatLabel: (date: Date) => string
    ) => {
      const dataMap: Record<string, { boleto: number; pix: number; cartao: number; label: string }> = {};
      
      intervals.forEach((date) => {
        const key = getKey(date);
        dataMap[key] = { boleto: 0, pix: 0, cartao: 0, label: formatLabel(date) };
      });

      filteredTransactions.forEach((t) => {
        const date = new Date(t.created_at);
        const key = getKey(date);
        if (dataMap[key]) {
          dataMap[key][t.type] += Number(t.amount);
        }
      });

      return Object.values(dataMap);
    };

    switch (period) {
      case 'day': {
        const days = eachDayOfInterval({ start: dateFilter.startDate, end: dateFilter.endDate });
        return aggregateData(
          days,
          (d) => format(d, 'yyyy-MM-dd'),
          (d) => format(d, 'dd/MM', { locale: ptBR })
        );
      }
      case 'week': {
        const weeks = eachWeekOfInterval({ start: dateFilter.startDate, end: dateFilter.endDate }, { locale: ptBR });
        return aggregateData(
          weeks,
          (d) => format(startOfWeek(d, { locale: ptBR }), 'yyyy-ww'),
          (d) => `Sem ${format(d, 'dd/MM', { locale: ptBR })}`
        );
      }
      case 'month': {
        const months = eachMonthOfInterval({ start: dateFilter.startDate, end: dateFilter.endDate });
        return aggregateData(
          months,
          (d) => format(d, 'yyyy-MM'),
          (d) => format(d, 'MMM', { locale: ptBR })
        );
      }
      case 'year': {
        const years = new Set(
          transactions
            .filter((t) => t.status === 'pago')
            .map((t) => new Date(t.created_at).getFullYear())
        );
        const yearDates = Array.from(years).sort().map((y) => new Date(y, 0, 1));
        return aggregateData(
          yearDates,
          (d) => format(d, 'yyyy'),
          (d) => format(d, 'yyyy')
        );
      }
    }
  }, [transactions, dateFilter, period]);

  const hasData = chartData.some((d) => d.boleto > 0 || d.pix > 0 || d.cartao > 0);

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold">Faturamento</h3>
          <p className="text-sm text-muted-foreground">Receita por período</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(['day', 'week', 'month', 'year'] as ChartPeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 px-3 text-xs"
              >
                {p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-info" />
          <span className="text-muted-foreground">Boleto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-muted-foreground">PIX</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-chart-4" />
          <span className="text-muted-foreground">Cartão</span>
        </div>
      </div>
      
      <div className="h-[300px]">
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Nenhuma transação paga no período selecionado</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBoleto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPix" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCartao" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis 
                dataKey="label" 
                stroke="hsl(215, 20%, 55%)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(215, 20%, 55%)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="boleto" 
                stroke="hsl(217, 91%, 60%)" 
                fillOpacity={1} 
                fill="url(#colorBoleto)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="pix" 
                stroke="hsl(142, 76%, 45%)" 
                fillOpacity={1} 
                fill="url(#colorPix)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="cartao" 
                stroke="hsl(280, 65%, 60%)" 
                fillOpacity={1} 
                fill="url(#colorCartao)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
