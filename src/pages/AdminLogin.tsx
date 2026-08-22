import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
      
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      
      if (profileError) {
         console.error("Profile fetch error:", profileError)
      }
      
      const userRole = profile?.role || 'patient';
      
      if (userRole !== 'admin') {
         await supabase.auth.signOut()
         throw new Error(`You do not have admin access. Found role: ${userRole}. Error: ${profileError?.message || 'none'}`)
      }
      
      toast.success('Admin login successful. Redirecting...')
      // Immediately navigate without timeout to avoid JS execution blocks
      window.location.assign('/admin/dashboard')
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-purple-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-30 pointer-events-none blur-[100px]">
         <div className="w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 opacity-30 pointer-events-none blur-[100px]">
         <div className="w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-24 h-24 mx-auto bg-white p-1 rounded-full shadow-xl shadow-indigo-500/10 mb-6">
          <img src="/logo.jpg" alt="MedoCare Logo" className="w-full h-full rounded-full object-cover" />
        </div>
        <h2 className="text-center text-4xl font-black text-slate-900 tracking-tight">Admin Portal</h2>
        <p className="mt-3 text-center text-base text-slate-600 font-medium">Restricted Access</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        <div className="bg-white/70 backdrop-blur-xl py-10 px-6 sm:px-12 shadow-2xl shadow-indigo-900/5 sm:rounded-3xl border border-white">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Admin Email</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all hover:bg-white" 
                  placeholder="admin@medocare.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all hover:bg-white" 
                  placeholder="••••••••" />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/30 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                {loading ? 'Authenticating...' : 'Secure Login (v2)'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm border-t border-slate-200/60 pt-6">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors">Return to standard login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
