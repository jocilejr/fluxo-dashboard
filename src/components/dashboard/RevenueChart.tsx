import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/hooks/useTransactions';
import { useMemo } from 'react';

interface RevenueChartProps {
  transactions: Transaction[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-lg p-3 border border-border/50">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name === 'boleto' ? 'Boleto' : entry.name === 'pix' ? 'PIX' : 'Cartão'}: R$ {entry.value.toLocaleString('pt-BR')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function RevenueChart({ transactions }: RevenueChartProps) {
  const chartData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dataByMonth: Record<string, { boleto: number; pix: number; cartao: number }> = {};

    // Initialize all months
    monthNames.forEach((month) => {
      dataByMonth[month] = { boleto: 0, pix: 0, cartao: 0 };
    });

    // Aggregate transactions by month
    transactions.forEach((t) => {
      if (t.status === 'pago') {
        const date = new Date(t.created_at);
        const month = monthNames[date.getMonth()];
        dataByMonth[month][t.type] += Number(t.amount);
      }
    });

    return monthNames.map((name) => ({
      name,
      ...dataByMonth[name],
    }));
  }, [transactions]);

  const hasData = transactions.some((t) => t.status === 'pago');

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Receitas por Método</h3>
          <p className="text-sm text-muted-foreground">Evolução mensal em 2024</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
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
      </div>
      
      <div className="h-[300px]">
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Os dados do gráfico aparecerão quando houver transações pagas</p>
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
                dataKey="name" 
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
