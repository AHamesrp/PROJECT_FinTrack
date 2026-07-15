import { createClient } from '@/lib/supabase/server'
import { HistoricoClient } from './historico-client'
import type { Statement } from '@/lib/types'

export default async function HistoricoPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data } = await supabase
    .from('statements')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const statements: Statement[] = data ?? []

  return <HistoricoClient statements={statements} />
}
