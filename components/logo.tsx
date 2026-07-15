import { BarChart3 } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 18, text: 'text-lg' },
    md: { icon: 22, text: 'text-xl' },
    lg: { icon: 28, text: 'text-2xl' },
  }

  return (
    /* foreground → cor do texto/ícone do logo (adapta ao tema) */
    <div className={`flex items-center gap-2 ${className}`}>
      {/* primary → ícone usa a cor primária do tema */}
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
        <BarChart3
          size={sizes[size].icon}
          className="text-primary-foreground"
          strokeWidth={1.8}
        />
      </div>
      <span className={`font-semibold tracking-tight text-foreground ${sizes[size].text}`}>
        FinTrack
      </span>
    </div>
  )
}
