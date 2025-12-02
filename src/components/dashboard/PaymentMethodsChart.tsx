import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction } from '@/hooks/useTransactions';
import { useMemo } from 'react';

interface PaymentMethodsChartProps {
  transactions: Transaction[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-lg p-3 border border-border/50">
        <p className="text-sm font-medium" style={{ color: payload[0].payload.color }}>
          {payload[0].name}: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export function PaymentMethodsChart({ transactions }: PaymentMethodsChartProps) {
  const data = useMemo(() => {
    const total = transactions.length;
    if (total === 0) {
      return [
        { name: 'PIX', value: 33, color: 'hsl(142, 76%, 45%)' },
        { name: 'Boleto', value: 33, color: 'hsl(217, 91%, 60%)' },
        { name: 'Cartão', value: 34, color: 'hsl(280, 65%, 60%)' },
      ];
    }

    const pixCount = transactions.filter((t) => t.type === 'pix').length;
    const boletoCount = transactions.filter((t) => t.type === 'boleto').length;
    const cartaoCount = transactions.filter((t) => t.type === 'cartao').length;

    return [
      { name: 'PIX', value: Math.round((pixCount / total) * 100), color: 'hsl(142, 76%, 45%)' },
      { name: 'Boleto', value: Math.round((boletoCount / total) * 100), color: 'hsl(217, 91%, 60%)' },
      { name: 'Cartão', value: Math.round((cartaoCount / total) * 100), color: 'hsl(280, 65%, 60%)' },
    ].filter((d) => d.value > 0);
  }, [transactions]);

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Distribuição de Pagamentos</h3>
        <p className="text-sm text-muted-foreground">Por método de pagamento</p>
      </div>
      
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-center gap-6 mt-4">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-muted-foreground">{entry.name}</span>
            <span className="text-sm font-medium">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
