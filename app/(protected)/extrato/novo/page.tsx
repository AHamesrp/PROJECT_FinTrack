'use client'

import { useState, useRef, useCallback } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { validateStatementFile, sanitizeStatementFileName } from '@/lib/security'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NovoExtratoPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [statementId, setStatementId] = useState<string | null>(null)
  const [uploadAttempts, setUploadAttempts] = useState(0)
  const [rateLimited, setRateLimited] = useState(false)

  useEffect(() => {
    if (uploadAttempts >= 3) {
      setRateLimited(true)
      setStatus('error')
      setErrorMsg('Muitas tentativas de upload. Aguarde alguns minutos antes de tentar novamente.')
    }
  }, [uploadAttempts])

  function handleFileSelect(f: File) {
    const validation = validateStatementFile(f)
    const err = validation.valid ? null : validation.reason
    if (err) {
      setErrorMsg(err)
      return
    }
    setErrorMsg(null)
    setFile(f)
    setStatus('idle')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  async function handleUpload() {
    if (!file) return
    if (rateLimited) {
      setStatus('error')
      setErrorMsg('Muitas tentativas de upload. Aguarde alguns minutos antes de tentar novamente.')
      return
    }

    setStatus('uploading')
    setErrorMsg(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('error'); setErrorMsg('Sessão expirada.'); return }

    /*
      Caminho de armazenamento:
      statements/{user_id}/{timestamp}_{filename}
      O script read.py deverá acessar o arquivo por este file_path.
    */
    const timestamp = Date.now()
    const sanitizedName = sanitizeStatementFileName(file.name)
    const filePath = `statements/${user.id}/${timestamp}_${sanitizedName}`

    /* Upload do arquivo no Supabase Storage (bucket: "statements") */
    const { error: storageError } = await supabase.storage
      .from('statements')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (storageError) {
      setUploadAttempts((prev) => prev + 1)
      setStatus('error')
      setErrorMsg('Erro ao fazer upload do arquivo. Tente novamente.')
      return
    }

    /* Cria o registro na tabela statements com status "pending" */
    const { data: stmt, error: dbError } = await supabase
      .from('statements')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError || !stmt) {
      setUploadAttempts((prev) => prev + 1)
      setStatus('error')
      setErrorMsg('Erro ao registrar o extrato. Tente novamente.')
      return
    }

    setUploadAttempts(0)
    setRateLimited(false)
    setStatus('processing')

    try {
      const response = await fetch(`/api/statements/${stmt.id}/process`, { method: 'POST' })
      const result = await response.json()

      if (!response.ok || !result?.success) {
        setStatus('error')
        setErrorMsg(result?.error || 'Erro ao processar o extrato.')
        return
      }

      setStatus('done')
    } catch (error) {
      setStatus('error')
      setErrorMsg('Erro ao processar o extrato. Tente novamente.')
      return
    }
  }

  return (
    /* background → fundo da área de conteúdo */
    <div className="flex flex-col gap-6 p-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Novo Extrato</h1>
        {/* muted-foreground → descrição secundária */}
        <p className="mt-0.5 text-sm text-muted-foreground">
          Faça o upload do seu extrato bancário para análise
        </p>
      </div>

      <div className="mx-auto w-full max-w-xl space-y-4">

        {/* Estado: upload concluído */}
        {status === 'done' && (
          /* card → painel de sucesso */
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Extrato enviado com sucesso!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O arquivo foi recebido e está aguardando processamento pelo sistema de análise.
            </p>
            {/* muted → separador visual */}
            <div className="my-4 h-px bg-border" />
            {/* secondary → caixa informativa sobre o read.py */}
            <div className="rounded-lg bg-muted px-4 py-3 text-left text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Processamento automático</p>
              <p className="mt-1">
                O extrato será processado imediatamente pelo sistema e os dados serão exibidos no dashboard.
              </p>
              <div className="mt-3 rounded bg-secondary px-3 py-2 text-xs font-mono text-foreground">
                ID do extrato: {statementId}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setFile(null); setStatus('idle'); setStatementId(null) }}
                className="flex-1 rounded-md border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Enviar outro
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Ver Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Estado: formulário de upload */}
        {status !== 'done' && (
          /* card → painel principal de upload */
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">

            {/* Zona de drag and drop */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !file && inputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                px-6 py-10 text-center transition-colors
                ${isDragging
                  /* accent → estado de drag ativo */
                  ? 'border-ring bg-accent'
                  : 'border-border hover:border-ring hover:bg-muted/50'
                }
                ${!file ? 'cursor-pointer' : ''}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.pdf,.xlsx,.xls,.ofx,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />

              {file ? (
                /* Arquivo selecionado */
                <div className="flex w-full items-center gap-3">
                  {/* secondary → fundo do ícone de arquivo */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <FileText size={20} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    {/* muted-foreground → tamanho do arquivo */}
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  {/* Botão para remover o arquivo */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setStatus('idle') }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                /* Instrução de upload */
                <>
                  {/* secondary → círculo do ícone de upload */}
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Upload size={22} className="text-secondary-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Arraste o arquivo aqui ou{' '}
                    <span className="underline underline-offset-4">clique para selecionar</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    CSV, PDF, XLS, XLSX, OFX &mdash; até 10 MB
                  </p>
                </>
              )}
            </div>

            {/* Mensagem de erro de validação */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            {/* Botão de envio */}
            <button
              onClick={handleUpload}
              disabled={!file || status === 'uploading'}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {status === 'uploading' && <Loader2 size={16} className="animate-spin" />}
              {status === 'uploading' ? 'Enviando...' : 'Enviar extrato'}
            </button>
          </div>
        )}

        {/* Informações sobre formatos suportados */}
        {status !== 'done' && (
          /* muted → painel informativo secundário */
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">Formatos suportados</p>
            <ul className="list-inside list-disc space-y-1 text-xs">
              <li>CSV — extratos exportados pela maioria dos bancos</li>
              <li>OFX — formato padrão Open Financial Exchange</li>
              <li>PDF — extrato em formato PDF</li>
              <li>XLS / XLSX — planilhas Excel</li>
            </ul>
            <p className="pt-1 text-xs">
              O extrato será processado automaticamente após o upload.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
