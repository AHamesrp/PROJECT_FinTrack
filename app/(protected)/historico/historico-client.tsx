'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Statement } from '@/lib/types'
import Link from 'next/link'

interface Props {
  statements: Statement[]
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const formatDateTime = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const formatBytes = (b: number | null) => {
  if (!b) return '—'
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

/*
  Mapa de status → estilo do badge
  secondary → badge neutro (pending/processing)
  primary → badge de sucesso (done)
  destructive → badge de erro
*/
function StatusBadge({ status }: { status: Statement['status'] }) {
  const map = {
    pending: {
      label: 'Pendente',
      icon: Loader,
      className: 'bg-secondary text-secondary-foreground',
    },
    processing: {
      label: 'Processando',
      icon: Loader,
      className: 'bg-secondary text-secondary-foreground',
    },
    done: {
      label: 'Concluído',
      icon: CheckCircle2,
      className: 'bg-primary/10 text-primary border border-primary/20',
    },
    error: {
      label: 'Erro',
      icon: AlertCircle,
      className: 'bg-destructive/10 text-destructive border border-destructive/20',
    },
  }
  const s = map[status]
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      <Icon size={11} />
      {s.label}
    </span>
  )
}

export function HistoricoClient({ statements: initial }: Props) {
  const router = useRouter()
  const [statements, setStatements] = useState<Statement[]>(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(stmt: Statement) {
    if (!confirm(`Excluir o extrato "${stmt.file_name}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(stmt.id)

    const response = await fetch(`/api/statements/${stmt.id}`, { method: 'DELETE' })
    if (!response.ok) {
      setDeleting(null)
      return
    }

    setStatements((prev) => prev.filter((s) => s.id !== stmt.id))
    setDeleting(null)
  }

  if (statements.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        {/* card → painel de estado vazio */}
        <div className="max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Clock size={24} className="text-secondary-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Sem extratos no histórico
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não enviou nenhum extrato bancário.
          </p>
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

  return (
    /* background → fundo da área de conteúdo */
    <div className="flex flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Histórico de Extratos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {statements.length} {statements.length === 1 ? 'extrato enviado' : 'extratos enviados'}
          </p>
        </div>
        <Link
          href="/extrato/novo"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Upload size={15} />
          Novo extrato
        </Link>
      </div>

      {/* Lista de extratos */}
      <div className="space-y-3">
        {statements.map((stmt) => (
          /* card → cada item do histórico */
          <div
            key={stmt.id}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            {/* Linha principal do extrato */}
            <div className="flex items-center gap-4 px-5 py-4">
              {/* secondary → ícone de arquivo */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <FileText size={18} className="text-secondary-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="truncate text-sm font-medium text-foreground">
                    {stmt.file_name}
                  </p>
                  <StatusBadge status={stmt.status} />
                </div>
                {/* muted-foreground → metadados secundários */}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(stmt.created_at)} &middot; {formatBytes(stmt.file_size)}
                  {stmt.bank_name && ` · ${stmt.bank_name}`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Expandir/recolher detalhes */}
                <button
                  onClick={() => setExpanded(expanded === stmt.id ? null : stmt.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={expanded === stmt.id ? 'Recolher detalhes' : 'Ver detalhes'}
                >
                  {expanded === stmt.id
                    ? <ChevronUp size={16} />
                    : <ChevronDown size={16} />}
                </button>
                {/* Excluir extrato */}
                <button
                  onClick={() => handleDelete(stmt)}
                  disabled={deleting === stmt.id}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  aria-label="Excluir extrato"
                >
                  {deleting === stmt.id
                    ? <Loader size={16} className="animate-spin" />
                    : <Trash2 size={16} />}
                </button>
              </div>
            </div>

            {/* Painel expandido: detalhes financeiros */}
            {expanded === stmt.id && (
              /* muted → fundo levemente distinto dos detalhes */
              <div className="border-t border-border bg-muted/30 px-5 py-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Período início', value: formatDate(stmt.period_start) },
                    { label: 'Período fim', value: formatDate(stmt.period_end) },
                    { label: 'Receitas', value: formatBRL(stmt.total_income) },
                    { label: 'Despesas', value: formatBRL(stmt.total_expenses) },
                  ].map((item) => (
                    <div key={item.label}>
                      {/* muted-foreground → rótulo do detalhe */}
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Saldo em destaque */}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground">Saldo final</p>
                  <p className={`text-sm font-semibold tabular-nums ${
                    stmt.balance >= 0 ? 'text-foreground' : 'text-destructive'
                  }`}>
                    {formatBRL(stmt.balance)}
                  </p>
                </div>

                {/* ID do extrato para uso com o read.py */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">ID do extrato</p>
                  <code className="mt-0.5 block rounded bg-secondary px-2 py-1 text-xs font-mono text-foreground break-all">
                    {stmt.id}
                  </code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
