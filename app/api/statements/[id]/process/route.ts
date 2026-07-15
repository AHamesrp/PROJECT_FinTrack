import { spawn } from 'node:child_process'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getPythonBinary() {
  return process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3')
}

function runPythonScript(scriptPath: string, inputFile: string) {
  const pythonBin = getPythonBinary()
  const child = spawn(pythonBin, [scriptPath, inputFile], {
    env: {
      ...process.env,
      TESSERACT_PATH: process.env.TESSERACT_PATH || '',
    },
  })

  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(new Error(stderr || `Python process exited with code ${code}`))
    })
  })
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: statement, error: statementError } = await supabase
    .from('statements')
    .select('id, file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (statementError || !statement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage.from('statements').download(statement.file_path)

  if (downloadError || !fileBlob) {
    await supabase
      .from('statements')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', statement.id)

    return NextResponse.json({ error: downloadError?.message || 'Unable to download file' }, { status: 500 })
  }

  const tempFilePath = join(tmpdir(), `${statement.id}_${Date.now()}_${statement.file_path.split('/').pop() || 'statement'}`)
  const tempBuffer = Buffer.from(await fileBlob.arrayBuffer())
  await writeFile(tempFilePath, tempBuffer)

  try {
    const scriptPath = join(process.cwd(), 'scripts', 'read.py')
    const { stdout } = await runPythonScript(scriptPath, tempFilePath)
    const result = JSON.parse(stdout)

    await supabase
      .from('statements')
      .update({
        status: result.success ? 'done' : 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', statement.id)

    return NextResponse.json(result)
  } catch (error) {
    await supabase
      .from('statements')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', statement.id)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao processar OCR',
      },
      { status: 500 },
    )
  } finally {
    try {
      await unlink(tempFilePath)
    } catch {
      // ignore cleanup errors
    }
  }
}
