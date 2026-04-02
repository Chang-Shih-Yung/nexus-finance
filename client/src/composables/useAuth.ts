import axios from 'axios'
import { ref, computed } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// ── Supabase session state ───────────────────────────────────────
const session = ref<Session | null>(null)

supabase.auth.getSession().then(({ data }) => {
  session.value = data.session
})

supabase.auth.onAuthStateChange((event, s) => {
  // INITIAL_SESSION 在 getSession() 已處理，避免重複覆蓋造成閃爍
  if (event !== 'INITIAL_SESSION') {
    session.value = s
  }
})

// ── Axios instance for Edge Functions ───────────────────────────
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ── useAuth composable ───────────────────────────────────────────
export function useAuth() {
  const isLoggedIn = computed(() => !!session.value)

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { isLoggedIn, login, logout }
}
