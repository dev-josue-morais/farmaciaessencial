import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

export type UserRole = 'customer' | 'pharmacist' | 'admin'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function parseRole(value: unknown): UserRole | null {
  return value === 'customer' || value === 'pharmacist' || value === 'admin'
    ? value
    : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    }).catch((sessionError: unknown) => {
      if (!active) return
      setError(sessionError instanceof Error ? sessionError.message : 'Não foi possível carregar a sessão.')
      setAuthLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true
    setRole(null)
    setError(null)

    if (!supabase || !user) {
      setProfileLoading(false)
      return () => {
        active = false
      }
    }

    setProfileLoading(true)
    void (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (!active) return
        if (profileError) {
          setError(profileError.message)
          setRole(null)
        } else {
          setRole(parseRole(data?.role))
        }
        setProfileLoading(false)
      } catch (profileError: unknown) {
        if (!active) return
        setError(profileError instanceof Error ? profileError.message : 'Não foi possível carregar o perfil.')
        setRole(null)
        setProfileLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [user?.id])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('O Supabase não está configurado.')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
  }, [])

  const value = useMemo(
    () => ({ user, role, loading: authLoading || profileLoading, error, signOut }),
    [user, role, authLoading, profileLoading, error, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
