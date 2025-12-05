import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/hooks/useTransactions';
import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RevenueChartProps {
  transactions: Transaction[];
}

type PeriodOption = '3d' | '7d' | '15d' | '1m' | '6m';

const periodOptions: { value: PeriodOption; label: string }[] = [
  { value: '3d', label: '3D' },
  { value: '7d', label: '7D' },
  { value: '15d', label: '15D' },
  { value: '1m', label: '1M' },
  { value: '6m', label: '6M' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    return (
      <div className="bg-card/95 backdrop-blur-md rounded-lg p-3 border border-border/50 shadow-xl">
        <p className="text-sm font-medium mb-2 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name === 'boleto' ? 'Boleto' : entry.name === 'pix' ? 'PIX' : 'Cartão'}: R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ))}
        <p className="text-xs font-medium mt-2 pt-2 border-t border-border/50 text-foreground">
          Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ transactions }: RevenueChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('7d');

  const dateRange = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start: Date;

    switch (selectedPeriod) {
      case '3d':
        start = startOfDay(subDays(now, 2));
        break;
      case '7d':
        start = startOfDay(subDays(now, 6));
        break;
      case '15d':
        start = startOfDay(subDays(now, 14));
        break;
      case '1m':
        start = startOfDay(subMonths(now, 1));
        break;
      case '6m':
        start = startOfDay(subMonths(now, 6));
        break;
      default:
        start = startOfDay(subDays(now, 6));
    }

    return { start, end };
  }, [selectedPeriod]);

  const chartData = useMemo(() => {
    const filteredTransactions = transactions.filter((t) => {
      const dateStr = t.paid_at || t.created_at;
      const date = new Date(dateStr);
      return date >= dateRange.start && date <= dateRange.end && t.status === 'pago';
    });

    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    const dataMap: Record<string, { boleto: number; pix: number; cartao: number; label: string }> = {};
    
    days.forEach((date) => {
      const key = format(date, 'yyyy-MM-dd');
      const labelFormat = selectedPeriod === '6m' ? 'dd/MM' : 'dd/MM';
      dataMap[key] = { boleto: 0, pix: 0, cartao: 0, label: format(date, labelFormat, { locale: ptBR }) };
    });

    filteredTransactions.forEach((t) => {
      const dateStr = t.paid_at || t.created_at;
      const date = new Date(dateStr);
      const key = format(date, 'yyyy-MM-dd');
      if (dataMap[key]) {
        dataMap[key][t.type] += Number(t.amount);
      }
    });

    return Object.values(dataMap);
  }, [transactions, dateRange, selectedPeriod]);

  const hasData = chartData.some((d) => d.boleto > 0 || d.pix > 0 || d.cartao > 0);

  const totalRevenue = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.boleto + d.pix + d.cartao, 0);
  }, [chartData]);

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold">Faturamento</h3>
            <span className="text-2xl font-bold text-primary">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Receita por método de pagamento</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedPeriod(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                selectedPeriod === option.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
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
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPix" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCartao" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="hsl(215, 20%, 55%)" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={selectedPeriod === '6m' ? 'preserveStartEnd' : 0}
                angle={selectedPeriod === '6m' || selectedPeriod === '1m' ? -45 : 0}
                textAnchor={selectedPeriod === '6m' || selectedPeriod === '1m' ? "end" : "middle"}
                height={selectedPeriod === '6m' || selectedPeriod === '1m' ? 60 : 30}
              />
              <YAxis 
                stroke="hsl(215, 20%, 55%)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                width={45}
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
