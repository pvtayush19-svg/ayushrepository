import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Activity, User, Stethoscope, Ambulance } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor' | 'ambulance'>('patient')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })
      if (error) throw error
      toast.success('Registration successful! Please login.')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.message || 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-indigo-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-30 pointer-events-none blur-[100px]">
         <div className="w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 opacity-30 pointer-events-none blur-[100px]">
         <div className="w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-24 h-24 mx-auto bg-white p-1 rounded-full shadow-xl shadow-blue-500/10 mb-6">
          <img src="/logo.jpg" alt="MedoCare Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-center text-4xl font-black text-slate-900 tracking-tight">Join MedoCare</h2>
        <p className="mt-3 text-center text-base text-slate-600 font-medium">Create your account to get started</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        <div className="bg-white/70 backdrop-blur-xl py-10 px-6 sm:px-12 shadow-2xl shadow-blue-900/5 sm:rounded-3xl border border-white">
          <form className="space-y-6" onSubmit={handleRegister}>
            
            {/* Role Selection Options */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 text-center">Select your account type</label>
              <div className="grid grid-cols-3 gap-3">
                <button type="button" onClick={() => setRole('patient')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${role === 'patient' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-105' : 'border-slate-200 hover:border-blue-300 text-slate-500 hover:bg-slate-50'}`}>
                  <User className={`mb-2 ${role === 'patient' ? 'text-blue-600' : 'text-slate-400'}`} size={28} />
                  <span className="text-xs font-black uppercase tracking-wider">Patient</span>
                </button>
                <button type="button" onClick={() => setRole('doctor')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${role === 'doctor' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-105' : 'border-slate-200 hover:border-indigo-300 text-slate-500 hover:bg-slate-50'}`}>
                  <Stethoscope className={`mb-2 ${role === 'doctor' ? 'text-indigo-600' : 'text-slate-400'}`} size={28} />
                  <span className="text-xs font-black uppercase tracking-wider">Doctor</span>
                </button>
                <button type="button" onClick={() => setRole('ambulance')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${role === 'ambulance' ? 'border-red-500 bg-red-50 text-red-700 shadow-md scale-105' : 'border-slate-200 hover:border-red-300 text-slate-500 hover:bg-slate-50'}`}>
                  <Ambulance className={`mb-2 ${role === 'ambulance' ? 'text-red-600' : 'text-slate-400'}`} size={28} />
                  <span className="text-xs font-black uppercase tracking-wider">Provider</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 mt-6"></div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
              <div className="mt-1">
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all hover:bg-white" 
                  placeholder="John Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all hover:bg-white" 
                  placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6}
                  className="appearance-none block w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all hover:bg-white" 
                  placeholder="••••••••" />
              </div>
            </div>



            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm border-t border-slate-200/60 pt-6">
            <span className="text-slate-500">Already have an account?</span>{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
