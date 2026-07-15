'use client'

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { Statement } from '@/lib/types'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

interface SummaryCardsProps {
  statement: Statement | null
}

export function SummaryCards({ statement }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Receitas',
      value: statement?.total_income ?? 0,
      icon: TrendingUp,
      /*
        card → fundo do card
        card-foreground → texto principal
        O ícone usa chart-1 (cinza mais escuro) para receitas
      */
      iconClass: 'text-chart-1',
    },
    {
      label: 'Despesas',
      value: statement?.total_expenses ?? 0,
      icon: TrendingDown,
      /* chart-3 (cinza médio) para despesas */
      iconClass: 'text-chart-3',
    },
    {
      label: 'Saldo',
      value: statement?.balance ?? 0,
      icon: Wallet,
      /* chart-2 para saldo */
      iconClass: 'text-chart-2',
    },
  ]

  return (
    /* Grid de 3 cards de resumo financeiro */
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          /*
            card → fundo do painel de cada métrica
            border-border → borda sutil entre cards e fundo
          */
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                {/* muted-foreground → rótulo da métrica (texto secundário) */}
                <p className="text-sm text-muted-foreground">{card.label}</p>
                {/* foreground → valor principal em destaque */}
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {formatCurrency(card.value)}
                </p>
              </div>
              {/* secondary → fundo circular do ícone */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Icon size={20} className={card.iconClass} strokeWidth={1.8} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
