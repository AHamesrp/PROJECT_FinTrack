'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Transaction } from '@/lib/types'

interface BarChartProps {
  transactions: Transaction[]
}

function groupByMonth(transactions: Transaction[]) {
  const map: Record<string, { mes: string; receitas: number; despesas: number }> = {}

  transactions.forEach((t) => {
    const date = t.transaction_date ? new Date(t.transaction_date) : new Date(t.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

    if (!map[key]) map[key] = { mes: label, receitas: 0, despesas: 0 }
    if (t.type === 'credit') map[key].receitas += t.amount
    else map[key].despesas += Math.abs(t.amount)
  })

  return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes))
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v)

export function TransactionsBarChart({ transactions }: BarChartProps) {
  const data = groupByMonth(transactions)

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-card">
        {/* muted-foreground → estado vazio */}
        <p className="text-sm text-muted-foreground">Sem dados de transações</p>
      </div>
    )
  }

  return (
    /*
      card → fundo do painel do gráfico
      border-border → borda sutil
    */
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium text-foreground">
        Receitas vs. Despesas por mês
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={4} barSize={18}>
          {/*
            CartesianGrid: stroke usa muted para linhas sutis
            XAxis/YAxis: texto com muted-foreground
          */}
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0 0 / 50%)" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatBRL}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            formatter={(value: number) => formatBRL(value)}
            contentStyle={{
              /* popover → fundo do tooltip */
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
          {/* chart-1 → barra de receitas (cinza escuro) */}
          <Bar dataKey="receitas" name="Receitas" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
          {/* chart-3 → barra de despesas (cinza médio) */}
          <Bar dataKey="despesas" name="Despesas" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
