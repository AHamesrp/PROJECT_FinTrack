'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Clock,
  User,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Novo Extrato',
    href: '/extrato/novo',
    icon: Upload,
  },
  {
    label: 'Histórico',
    href: '/historico',
    icon: Clock,
  },
  {
    label: 'Conta',
    href: '/conta',
    icon: User,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    /*
      sidebar → fundo da barra lateral (branco no light, cinza escuro no dark)
      sidebar-border → linha separadora direita
    */
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Topo: Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo size="md" />
      </div>

      {/* Navegação principal */}
      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors
                ${active
                  /*
                    sidebar-primary → item ativo: fundo e texto destaque
                    (cinza escuro no light, cinza claro no dark)
                  */
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  /*
                    sidebar-foreground → itens inativos
                    sidebar-accent → hover
                  */
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              <Icon size={18} strokeWidth={1.8} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé: botão de logout */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {/* muted-foreground → ícone de logout */}
          <LogOut size={18} strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </aside>
  )
}
