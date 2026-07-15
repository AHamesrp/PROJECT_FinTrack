export type Theme = 'light' | 'dark'

export interface Profile {
  id: string
  email: string | null
  theme: Theme
  created_at: string
  updated_at: string
}

export interface Statement {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number | null
  status: 'pending' | 'processing' | 'done' | 'error'
  bank_name: string | null
  period_start: string | null
  period_end: string | null
  total_income: number
  total_expenses: number
  balance: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  statement_id: string
  user_id: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  category: string | null
  transaction_date: string | null
  created_at: string
}
