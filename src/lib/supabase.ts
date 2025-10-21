import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type AuthUser = {
  id: string
  email: string
  user_metadata: {
    first_name?: string
    last_name?: string
  }
}

export type Conversation = {
  id: string
  user_id: string
  title: string
  preview: string
  context_level: string
  difficulty_level: string
  context_locked: boolean
  difficulty_locked: boolean
  created_at: string
  updated_at: string
}