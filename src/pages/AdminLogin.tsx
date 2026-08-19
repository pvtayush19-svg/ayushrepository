import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { session, role } = useAuth()

  // Redirect if already logged in and role is verified
  React.useEffect(() => {
    if (session && role === 'admin') {
      navigate('/admin/dashboard')
    }
  }, [session, role, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      const userRole = profile?.role || 'patient';
      
      if (userRole !== 'admin') {
         await supabase.auth.signOut()
         throw new Error("You do not have admin access.")
      }
      
      toast.success('Admin login successful. Redirecting...')
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">Admin Secure Login</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-300">Admin Email</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 bg-slate-700 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 bg-slate-700 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50">
                {loading ? 'Authenticating...' : 'Secure Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
