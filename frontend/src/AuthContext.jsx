import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { api } from './lib/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile() {
    try {
      setProfile(await api('/auth/me'))
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await loadProfile()
      setLoading(false)
    })
  }, [])

  async function authenticate(path, body) {
    const data = await api(path, { method: 'POST', body })
    if (!data.access_token) throw new Error(data.message || 'Check your email to confirm')
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    await loadProfile()
  }

  const login = (email, password) => authenticate('/auth/login', { email, password })
  const register = (full_name, email, password) =>
    authenticate('/auth/register', { full_name, email, password })

  async function logout() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{ profile, loading, login, register, logout, refreshProfile: loadProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}