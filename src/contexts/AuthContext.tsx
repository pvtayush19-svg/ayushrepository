import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type AuthContextType = {
  session: Session | null
  user: User | null
  role: 'patient' | 'doctor' | 'ambulance' | 'admin' | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'patient' | 'doctor' | 'ambulance' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      const userRole = data?.role || null
      
      if (userRole === 'doctor') {
        const { data: docData } = await supabase.from('doctors').select('is_verified').eq('profile_id', userId).maybeSingle()
        if (docData && !docData.is_verified) {
          toast.error('Your application is pending admin approval. You cannot log in yet.')
          await supabase.auth.signOut()
          setRole(null)
          return
        }
      }

      if (userRole === 'ambulance') {
        const { data: ambData } = await supabase.from('ambulance_providers').select('is_verified').eq('profile_id', userId).maybeSingle()
        if (ambData && !ambData.is_verified) {
          toast.error('Your application is pending admin approval. You cannot log in yet.')
          await supabase.auth.signOut()
          setRole(null)
          return
        }
      }

      setRole(userRole)
    } catch (error) {
      console.error('Error fetching role, clearing role for security:', error)
      setRole(null) // Security Fix: Fail closed instead of defaulting to patient
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
