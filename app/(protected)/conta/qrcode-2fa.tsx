'use client'

interface QRCodeProps {
  qrUrl: string
}

/*
  O Supabase retorna um data-URL (SVG/PNG) como qr_code.
  Exibimos diretamente como <img> dentro de um painel com fundo branco
  para garantir contraste independente do tema.
*/
export default function QRCode({ qrUrl }: QRCodeProps) {
  return (
    /*
      Fundo branco fixo para o QR Code (necessário para legibilidade
      em ambos os temas claro e escuro)
    */
    <div className="rounded-lg border border-border bg-white p-3">
      <img
        src={qrUrl}
        alt="QR Code para configuração do autenticador 2FA"
        width={160}
        height={160}
        className="block"
      />
    </div>
  )
}
