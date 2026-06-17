import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) { setProfile(null); return }
    // maybeSingle() returns null (not an error) when the profile row
    // doesn't exist yet — e.g. right after sign-up before the row is created.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, is_active')
      .eq('id', authUser.id)
      .maybeSingle()
    if (error) { console.warn('Profile fetch:', error.message); setProfile(null) }
    else setProfile(data)
  }, [])

  useEffect(() => {
    let ignore = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (ignore) return
      setUser(session?.user ?? null)
      fetchProfile(session?.user ?? null).finally(() => setLoading(false))
    })
    // NOTE: the onAuthStateChange callback must NOT await other supabase
    // calls directly — doing so can deadlock the auth client's internal
    // lock (a documented supabase-js issue). Defer profile fetching so the
    // callback returns immediately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ignore) return
      setUser(session?.user ?? null)
      setTimeout(() => {
        if (ignore) return
        fetchProfile(session?.user ?? null).finally(() => { if (!ignore) setLoading(false) })
      }, 0)
    })
    return () => { ignore = true; subscription.unsubscribe() }
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user)
  }, [user, fetchProfile])

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
