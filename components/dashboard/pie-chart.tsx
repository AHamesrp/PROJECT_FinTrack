'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Transaction } from '@/lib/types'

interface CategoryPieChartProps {
  transactions: Transaction[]
}

/* Escala de cinza para as fatias da pizza */
const GRAY_SCALE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function groupByCategory(transactions: Transaction[]) {
  const map: Record<string, number> = {}

  transactions
    .filter((t) => t.type === 'debit')
    .forEach((t) => {
      const cat = t.category ?? 'Outros'
      map[cat] = (map[cat] ?? 0) + Math.abs(t.amount)
    })

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function CategoryPieChart({ transactions }: CategoryPieChartProps) {
  const data = groupByCategory(transactions)

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Sem categorias para exibir</p>
      </div>
    )
  }

  return (
    /*
      card → fundo do painel
      border-border → borda sutil
    */
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium text-foreground">
        Despesas por categoria
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                /* chart-1..5 → fatias da pizza em escala de cinza */
                fill={GRAY_SCALE[index % GRAY_SCALE.length]}
                stroke="var(--color-card)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatBRL(value)}
            contentStyle={{
              backgroundColor: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--color-popover-foreground)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'var(--color-muted-foreground)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
