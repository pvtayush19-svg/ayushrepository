import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Activity } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { session, role } = useAuth()

  // Redirect if already logged in
  React.useEffect(() => {
    if (session && role) {
      if (role === 'admin') {
        supabase.auth.signOut().then(() => {
          toast.error('Admins cannot use this login page. Please use the Admin Portal.')
        })
      } else if (role === 'patient') navigate('/patient/dashboard')
      else if (role === 'doctor') navigate('/doctor/dashboard')
      else if (role === 'ambulance') navigate('/ambulance/dashboard')
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
      
      if (userRole === 'admin') {
         await supabase.auth.signOut()
         throw new Error("Admins cannot use this login page. Please use the Admin Portal.")
      }
      
      toast.success('Logged in successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src="/logo.jpg" alt="MedoCare Logo" className="mx-auto h-16 w-16 rounded-full object-cover shadow-md" />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Sign in to MedoCare</h2>
        <p className="mt-2 text-center text-sm text-slate-600">For Patients, Doctors, and Ambulance Providers</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 glass">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm border-t border-slate-200 pt-6">
            Don't have an account? <Link to="/register" className="text-primary hover:text-primary/90 font-medium">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
