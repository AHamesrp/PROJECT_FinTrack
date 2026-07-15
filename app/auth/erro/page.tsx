import Link from 'next/link'

export default function AuthErroPage() {
  return (
    /* bg-background → fundo geral da página */
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* card → bg-card com borda sutil */}
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        {/* foreground → texto principal */}
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Erro de autenticação
        </h1>
        {/* muted-foreground → texto secundário/legendas */}
        <p className="mb-6 text-sm text-muted-foreground">
          Ocorreu um problema ao verificar sua identidade. Tente novamente.
        </p>
        {/* primary → botão primário (cinza escuro no light, cinza claro no dark) */}
        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Voltar ao login
        </Link>
      </div>
    </main>
  )
}
