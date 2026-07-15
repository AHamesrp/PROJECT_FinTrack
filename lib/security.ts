const ALLOWED_STATEMENT_TYPES = new Set([
  'text/csv',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/xml',
  'text/plain',
])

const ALLOWED_STATEMENT_EXTENSIONS = /\.(csv|pdf|xlsx|xls|ofx|txt)$/i
const MAX_STATEMENT_SIZE_BYTES = 10 * 1024 * 1024

export function validateStatementFile(file: File) {
  if (!ALLOWED_STATEMENT_TYPES.has(file.type) && !ALLOWED_STATEMENT_EXTENSIONS.test(file.name)) {
    return {
      valid: false,
      reason: 'Formato não suportado. Use CSV, PDF, XLS, XLSX, OFX ou TXT.',
    }
  }

  if (file.size > MAX_STATEMENT_SIZE_BYTES) {
    return {
      valid: false,
      reason: 'O arquivo não pode ultrapassar 10 MB.',
    }
  }

  return { valid: true, reason: null }
}

export function sanitizeStatementFileName(fileName: string) {
  const baseName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_')
  const safeName = baseName.trim() || 'statement'
  return safeName.slice(0, 120)
}

export function validatePasswordStrength(password: string) {
  if (password.length < 12) {
    return 'A senha deve ter pelo menos 12 caracteres.'
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'A senha deve incluir letras maiúsculas e minúsculas.'
  }

  if (!/\d/.test(password)) {
    return 'A senha deve incluir pelo menos um número.'
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'A senha deve incluir pelo menos um símbolo especial.'
  }

  return null
}
