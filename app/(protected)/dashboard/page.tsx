import { createClient } from '@/lib/supabase/server'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { TransactionsBarChart } from '@/components/dashboard/bar-chart'
import { CategoryPieChart } from '@/components/dashboard/pie-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import type { Statement, Transaction } from '@/lib/types'
import Link from 'next/link'
import { Upload } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  /* Busca o extrato mais recente do usuário */
  const { data: statements } = await supabase
    .from('statements')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastStatement: Statement | null = statements?.[0] ?? null

  let transactions: Transaction[] = []
  if (lastStatement) {
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('statement_id', lastStatement.id)
      .order('transaction_date', { ascending: false })
    transactions = txData ?? []
  }

  /* Estado vazio: nenhum extrato enviado ainda */
  if (!lastStatement) {
    return (
      /*
        background → fundo da área de conteúdo
      */
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        {/* card → painel de estado vazio */}
        <div className="max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
          {/* secondary → fundo do círculo de ícone */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Upload size={24} className="text-secondary-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Nenhum extrato ainda
          </h2>
          {/* muted-foreground → descrição do estado vazio */}
          <p className="mt-2 text-sm text-muted-foreground">
            Faça o upload do seu primeiro extrato bancário para visualizar a análise.
          </p>
          {/* primary → botão de ação principal */}
          <Link
            href="/extrato/novo"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Upload size={16} />
            Enviar extrato
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  return (
    /* background → fundo geral da área do dashboard */
    <div className="flex flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          {/* muted-foreground → informação do período do extrato */}
          <p className="mt-0.5 text-sm text-muted-foreground">
            Extrato:{' '}
            <span className="text-foreground">{lastStatement.file_name}</span>
            {lastStatement.period_start && (
              <> &mdash; {formatDate(lastStatement.period_start)} a {formatDate(lastStatement.period_end)}</>
            )}
          </p>
        </div>
        {/* secondary → botão secundário de ação */}
        <Link
          href="/extrato/novo"
          className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-80"
        >
          <Upload size={15} />
          Novo extrato
        </Link>
      </div>

      {/* Cards de resumo: Receitas, Despesas, Saldo */}
      <SummaryCards statement={lastStatement} />

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TransactionsBarChart transactions={transactions} />
        <CategoryPieChart transactions={transactions} />
      </div>

      {/* Tabela de transações recentes */}
      <RecentTransactions transactions={transactions} />
    </div>
  )
}
