import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    set({ user: session?.user ?? null, loading: false })
  })

  supabase.auth.onAuthStateChange((_event, session) => {
    set({ user: session?.user ?? null, loading: false })
  })

  return {
    user: null,
    loading: true,

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    },

    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({ email, password })
      return error?.message ?? null
    },

    signOut: async () => {
      await supabase.auth.signOut()
      localStorage.removeItem('mycar-store-v2')
      window.location.reload()
    },
  }
})
