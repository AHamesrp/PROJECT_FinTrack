'use client'

import type { Transaction } from '@/lib/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(v))

const formatDate = (d: string | null) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const recent = transactions.slice(0, 8)

  if (recent.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
      </div>
    )
  }

  return (
    /*
      card → fundo do painel da tabela
      border-border → borda do card
    */
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium text-foreground">Transações recentes</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {/* muted-foreground → cabeçalhos da tabela */}
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Data</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Descrição</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((t, i) => (
              <tr
                key={t.id}
                /* muted → linha zebrada para melhor leitura */
                className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-muted/40' : ''}`}
              >
                <td className="px-5 py-3 text-muted-foreground tabular-nums">
                  {formatDate(t.transaction_date)}
                </td>
                <td className="px-5 py-3 text-foreground">{t.description}</td>
                <td className="px-5 py-3">
                  {t.category ? (
                    /* secondary → badge de categoria */
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {t.category}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className={`px-5 py-3 text-right font-medium tabular-nums ${
                    /*
                      chart-1 (cinza escuro) → valor positivo (crédito)
                      chart-3 (cinza médio) → valor negativo (débito)
                    */
                    t.type === 'credit' ? 'text-chart-1' : 'text-chart-3'
                  }`}
                >
                  {t.type === 'credit' ? '+' : '-'} {formatBRL(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
