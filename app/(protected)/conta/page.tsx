import { createClient } from '@/lib/supabase/server'
import { ContaClient } from './conta-client'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <ContaClient
      email={user?.email ?? ''}
      currentTheme={profile?.theme ?? 'dark'}
      userId={user!.id}
    />
  )
}
