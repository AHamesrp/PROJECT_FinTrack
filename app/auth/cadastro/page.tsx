'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import { validatePasswordStrength } from '@/lib/security'

export default function CadastroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    const passwordError = validatePasswordStrength(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  /* Estado de sucesso após cadastro */
  if (success) {
    return (
      /* background → fundo da página */
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Logo size="lg" />
          </div>
          {/* card → painel de confirmação */}
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            {/* chart-1 (cinza escuro) → ícone de confirmação */}
            <CheckCircle2 size={40} className="mx-auto mb-3 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">
              Conta criada com sucesso!
            </h1>
            {/* muted-foreground → texto de instrução secundária */}
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um link de confirmação para{' '}
              <span className="font-medium text-foreground">{email}</span>.
              Acesse seu e-mail para ativar a conta.
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
            >
              Ir para o login
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Criar nova conta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Comece a analisar seus extratos bancários
            </p>
          </div>
        </div>

        {/* card → painel do formulário de cadastro */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleCadastro} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                E-mail
              </label>
              {/* input → fundo dos campos */}
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
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Confirmar senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                required
              />
            </div>

            {/* destructive → mensagem de validação/erro */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* primary → botão principal */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Criar conta
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-foreground underline underline-offset-4 hover:opacity-80"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
