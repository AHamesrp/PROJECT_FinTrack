'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Eye, EyeOff, Loader2, CheckCircle2, Sun, Moon, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import QRCode from './qrcode-2fa'

interface Props {
  email: string
  currentTheme: string
  userId: string
}

export function ContaClient({ email, currentTheme, userId }: Props) {
  const { theme, setTheme } = useTheme()

  /* Troca de senha */
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)

  /* 2FA setup */
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaQr, setMfaQr] = useState<string | null>(null)
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaVerifyLoading, setMfaVerifyLoading] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)

  async function handleThemeChange(newTheme: 'light' | 'dark') {
    setTheme(newTheme)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ theme: newTheme, updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(false)

    if (newPwd !== confirmPwd) {
      setPwdError('As senhas não coincidem.')
      return
    }
    if (newPwd.length < 8) {
      setPwdError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }

    setPwdLoading(true)
    const supabase = createClient()

    /* Reautentica para validar senha atual */
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPwd,
    })

    if (reAuthError) {
      setPwdError('Senha atual incorreta.')
      setPwdLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd })

    if (updateError) {
      setPwdError('Não foi possível atualizar a senha.')
    } else {
      setPwdSuccess(true)
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    }
    setPwdLoading(false)
  }

  async function handleSetup2FA() {
    setMfaLoading(true)
    setMfaError(null)
    const supabase = createClient()

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'FinTrack',
    })

    if (error || !data) {
      setMfaError('Erro ao gerar o QR Code. Tente novamente.')
      setMfaLoading(false)
      return
    }

    setMfaQr(data.totp.qr_code)
    setMfaSecret(data.totp.secret)
    setMfaFactorId(data.id)
    setMfaLoading(false)
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaFactorId) return
    setMfaVerifyLoading(true)
    setMfaError(null)

    const supabase = createClient()
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: mfaFactorId })

    if (challengeError || !challengeData) {
      setMfaError('Erro ao iniciar desafio 2FA.')
      setMfaVerifyLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code: mfaCode,
    })

    if (verifyError) {
      setMfaError('Código inválido. Tente novamente.')
      setMfaVerifyLoading(false)
      return
    }

    setMfaEnabled(true)
    setMfaQr(null)
    setMfaCode('')
    setMfaVerifyLoading(false)
  }

  const activeTheme = theme ?? currentTheme

  return (
    /* background → fundo da área de conteúdo */
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Conta</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gerencie suas informações e preferências
        </p>
      </div>

      <div className="mx-auto w-full max-w-xl space-y-4">

        {/* ── Seção: Informações da conta ── */}
        {/* card → painel de seção */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Informações da conta
          </h2>
          <div className="space-y-3">
            <div>
              {/* muted-foreground → rótulo de campo */}
              <p className="text-xs text-muted-foreground">E-mail</p>
              {/* secondary → campo somente leitura */}
              <div className="mt-1 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                {email}
              </div>
            </div>
          </div>
        </div>

        {/* ── Seção: Tema ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Aparência</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Botão: tema claro */}
            <button
              onClick={() => handleThemeChange('light')}
              className={`
                flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors
                ${activeTheme === 'light'
                  /*
                    primary → borda e texto quando tema está ativo
                  */
                  ? 'border-primary bg-primary/5 text-foreground'
                  /*
                    border → borda padrão inativo
                    muted-foreground → texto inativo
                  */
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                }
              `}
            >
              <Sun size={18} />
              Claro
            </button>
            {/* Botão: tema escuro */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`
                flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors
                ${activeTheme === 'dark'
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                }
              `}
            >
              <Moon size={18} />
              Escuro
            </button>
          </div>
        </div>

        {/* ── Seção: Trocar senha ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Trocar senha</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { label: 'Senha atual', value: currentPwd, set: setCurrentPwd },
              { label: 'Nova senha', value: newPwd, set: setNewPwd },
              { label: 'Confirmar nova senha', value: confirmPwd, set: setConfirmPwd },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">{field.label}</label>
                <div className="relative">
                  {/* input → fundo dos campos de formulário */}
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}

            {pwdError && (
              <p className="text-sm text-destructive">{pwdError}</p>
            )}
            {pwdSuccess && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 size={15} />
                Senha atualizada com sucesso.
              </div>
            )}

            {/* primary → botão principal */}
            <button
              type="submit"
              disabled={pwdLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pwdLoading && <Loader2 size={16} className="animate-spin" />}
              Atualizar senha
            </button>
          </form>
        </div>

        {/* ── Seção: Verificação em duas etapas (2FA) ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            {/* secondary → ícone de segurança */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <ShieldCheck size={20} className="text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">
                Verificação em duas etapas
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Adicione uma camada extra de segurança com um app autenticador (TOTP).
              </p>
            </div>
          </div>

          {mfaEnabled ? (
            /* Estado: 2FA ativado com sucesso */
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
              <CheckCircle2 size={16} className="text-primary" />
              Verificação em duas etapas ativada com sucesso!
            </div>
          ) : mfaQr ? (
            /* Estado: QR Code gerado, aguarda verificação */
            <div className="mt-4 space-y-4">
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-sm text-muted-foreground">
                  Escaneie o QR Code com seu app autenticador (Google Authenticator, Authy, etc.)
                </p>
                {/* Exibe o QR Code gerado pelo Supabase */}
                <QRCode qrUrl={mfaQr} />
                {mfaSecret && (
                  <div className="w-full">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Ou insira o código manualmente:
                    </p>
                    {/* secondary → código secreto TOTP */}
                    <code className="block rounded-md bg-secondary px-3 py-2 text-center text-xs font-mono tracking-widest text-foreground">
                      {mfaSecret}
                    </code>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Código de verificação
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-center font-mono text-lg tracking-[0.4em] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                    required
                  />
                </div>
                {mfaError && <p className="text-sm text-destructive">{mfaError}</p>}
                <button
                  type="submit"
                  disabled={mfaVerifyLoading || mfaCode.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {mfaVerifyLoading && <Loader2 size={16} className="animate-spin" />}
                  Confirmar e ativar
                </button>
              </form>
            </div>
          ) : (
            /* Estado: botão para iniciar configuração */
            <button
              onClick={handleSetup2FA}
              disabled={mfaLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {mfaLoading && <Loader2 size={16} className="animate-spin" />}
              Configurar verificação em duas etapas
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
