'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'azure' | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)

  /* Etapa 2: verificação 2FA via TOTP */
  const [needsMfa, setNeedsMfa] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    /* Verificar se há fatores 2FA registrados */
    const { data: mfaData } = await supabase.auth.mfa.listFactors()
    const totpFactor = mfaData?.totp?.find((f) => f.status === 'verified')

    if (totpFactor) {
      setFactorId(totpFactor.id)
      setNeedsMfa(true)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleOAuthLogin(provider: 'google' | 'azure') {
    setError(null)
    setOauthError(null)
    setOauthLoading(provider)

    const supabase = createClient()
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        flowType: 'pkce',
      },
    })

    if (oauthError) {
      setOauthError('Não foi possível entrar com esta conta no momento.')
      setOauthLoading(null)
      return
    }

    if (data.url) {
      window.location.assign(data.url)
    } else {
      setOauthError('Não foi possível iniciar o login. Tente novamente.')
      setOauthLoading(null)
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setMfaError(null)
    setMfaLoading(true)

    const supabase = createClient()
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })

    if (challengeError || !challengeData) {
      setMfaError('Erro ao iniciar o desafio 2FA.')
      setMfaLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: mfaCode,
    })

    if (verifyError) {
      setMfaError('Código inválido. Tente novamente.')
      setMfaLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  /* ── Etapa 2: Verificação 2FA ── */
  if (needsMfa) {
    return (
      /* background → fundo geral da página de auth */
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Logo size="lg" />
            <div className="text-center">
              {/* foreground → título principal */}
              <h1 className="text-xl font-semibold text-foreground">
                Verificação em duas etapas
              </h1>
              {/* muted-foreground → subtítulo/descrição */}
              <p className="mt-1 text-sm text-muted-foreground">
                Digite o código do seu aplicativo autenticador
              </p>
            </div>
          </div>

          {/* card → painel de formulário com borda sutil */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Código de 6 dígitos
                </label>
                {/* input → fundo do campo de formulário */}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-center text-lg font-mono tracking-[0.4em] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  required
                />
              </div>

              {/* destructive → mensagem de erro */}
              {mfaError && (
                <p className="text-sm text-destructive">{mfaError}</p>
              )}

              {/* primary → botão principal de ação */}
              <button
                type="submit"
                disabled={mfaLoading || mfaCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mfaLoading && <Loader2 size={16} className="animate-spin" />}
                Verificar
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <button
              onClick={() => { setNeedsMfa(false); setMfaCode('') }}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Voltar ao login
            </button>
          </p>
        </div>
      </main>
    )
  }

  /* ── Etapa 1: Login com e-mail e senha ── */
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Entrar na sua conta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesse o painel de análise de extratos
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  required
                />
                {/* muted-foreground → ícone de toggle de senha */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>
          </form>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                ou continue com
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={oauthLoading !== null}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span className="text-base font-semibold">G</span>
                )}
                Entrar com Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin('azure')}
                disabled={oauthLoading !== null}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {oauthLoading === 'azure' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span className="text-base font-semibold">M</span>
                )}
                Entrar com Microsoft
              </button>
            </div>

            {oauthError && (
              <p className="text-sm text-destructive">{oauthError}</p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          {/* ring/accent → link de navegação */}
          <Link
            href="/auth/cadastro"
            className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
