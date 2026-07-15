import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: statement, error: fetchError } = await supabase
    .from('statements')
    .select('id, file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !statement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error: storageError } = await supabase.storage.from('statements').remove([statement.file_path])
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { error: deleteError } = await supabase.from('statements').delete().eq('id', statement.id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
