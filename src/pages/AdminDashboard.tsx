import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { LogOut, Activity, Stethoscope, Ambulance, ShieldCheck, Clock, Users, XCircle, Moon, Sun, Menu, X } from 'lucide-react'

export default function AdminDashboard() {
  const { session } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [ambulances, setAmbulances] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'doctors' | 'ambulances'>('doctors')
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const toggleTheme = () => {
    const root = document.documentElement
    if (root.classList.contains('dark')) {
      root.classList.remove('dark')
      setIsDarkMode(false)
    } else {
      root.classList.add('dark')
      setIsDarkMode(true)
    }
  }

  const fetchData = async () => {
    // Fetch profiles
    const { data: profileData } = await supabase.from('profiles').select('*')
    if (profileData) setUsers(profileData)

    // Fetch doctors with profile details
    const { data: docData } = await supabase.from('doctors').select('*, profiles:profile_id(full_name, email)')
    if (docData) setDoctors(docData)

    // Fetch ambulances
    const { data: ambData } = await supabase.from('ambulance_providers').select('*, profiles:profile_id(full_name, email)')
    if (ambData) setAmbulances(ambData)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const toggleVerification = async (table: 'doctors' | 'ambulance_providers', id: string, profileId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from(table).update({ is_verified: newStatus }).eq('id', id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated successfully')
      
      if (newStatus) {
        // Send a notification
        await supabase.from('notifications').insert({
          user_id: profileId,
          title: 'Account Verified',
          message: 'Congratulations! Your application has been approved by the Administrator.'
        });
      }
      
      fetchData()
    }
  }

  const rejectApplication = async (table: 'doctors' | 'ambulance_providers', id: string) => {
    if (!window.confirm("Are you sure you want to reject and delete this application?")) return;
    
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      toast.error('Failed to reject application')
    } else {
      toast.success('Application rejected and removed')
      fetchData()
    }
  }

  // Metrics calculations
  const totalDoctors = doctors.length
  const pendingDoctors = doctors.filter(d => !d.is_verified).length
  const totalAmbulances = ambulances.length
  const pendingAmbulances = ambulances.filter(a => !a.is_verified).length

  const sortedDoctors = [...doctors].sort((a, b) => (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''))
  const sortedAmbulances = [...ambulances].sort((a, b) => (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || ''))

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <h1 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full object-cover" /> MedoAdmin
        </h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex fixed md:sticky top-[73px] md:top-0 left-0 w-full md:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between h-[calc(100vh-73px)] md:h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300 overflow-y-auto`}>
        <div>
          <div className="p-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-3 tracking-tight">
              <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" /> MedoAdmin
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 ml-1">Platform Control Center</p>
          </div>

          <nav className="px-4 mt-6 space-y-2">
            <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Verifications</p>
            <button 
              onClick={() => { setActiveTab('doctors'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'doctors' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Stethoscope size={20} />
              Doctors 
              {pendingDoctors > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingDoctors} new</span>}
            </button>

            <button 
              onClick={() => { setActiveTab('ambulances'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'ambulances' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Ambulance size={20} />
              Ambulances
              {pendingAmbulances > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingAmbulances} new</span>}
            </button>
          </nav>
        </div>

        <div className="p-4 space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
            <LogOut size={18} /> Secure Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden transition-colors duration-300">
        {/* Dynamic Abstract Background Elements */}
        <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12 relative z-10 space-y-8 md:space-y-12">
          
          {/* Header & Metrics */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Platform Overview</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mt-1 font-medium">Real-time statistics and pending verification queue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                onClick={() => setActiveTab('doctors')}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 hover:border-indigo-500/50">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                  <Users size={24} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Doctors</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{totalDoctors}</p>
              </div>
              <div 
                onClick={() => setActiveTab('ambulances')}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 hover:border-purple-500/50">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                  <Ambulance size={24} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-semibold mb-1">Total Ambulances</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{totalAmbulances}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800 hover:shadow-md transition-shadow col-span-1 md:col-span-2 relative overflow-hidden flex items-center gap-6">
                <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-orange-50 dark:from-orange-900/20 to-transparent pointer-events-none"></div>
                <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center shrink-0">
                  <Clock size={28} />
                </div>
                <div>
                  <p className="text-orange-600 dark:text-orange-400 font-bold mb-1 tracking-wide uppercase text-xs">Action Required</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{pendingDoctors + pendingAmbulances} <span className="text-lg font-bold text-slate-500 dark:text-slate-400">Pending Applications</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Verification Tables */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors duration-300">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  {activeTab === 'doctors' ? <Stethoscope className="text-indigo-600 dark:text-indigo-400" /> : <Ambulance className="text-purple-600 dark:text-purple-400" />} 
                  {activeTab === 'doctors' ? 'Doctor Verification Queue' : 'Ambulance Provider Queue'}
                </h3>
              </div>
              
              <div className="overflow-x-auto w-[100vw] md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white dark:bg-slate-900">
                    <tr>
                      <th className="p-5 font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-[11px] border-b border-slate-100 dark:border-slate-800">Applicant Info</th>
                      {activeTab === 'doctors' && <th className="p-5 font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-[11px] border-b border-slate-100 dark:border-slate-800">Specialization</th>}
                      {activeTab === 'ambulances' && <th className="p-5 font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-[11px] border-b border-slate-100 dark:border-slate-800">Vehicle Info</th>}
                      <th className="p-5 font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-[11px] border-b border-slate-100 dark:border-slate-800">Status</th>
                      <th className="p-5 font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-[11px] border-b border-slate-100 dark:border-slate-800 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {activeTab === 'doctors' && sortedDoctors.map(doc => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-5">
                          <p className="font-bold text-slate-900 dark:text-white text-base">{doc.profiles?.full_name}</p>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{doc.profiles?.email}</p>
                        </td>
                        <td className="p-5">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm border border-slate-200/60 dark:border-slate-700">
                            {doc.specialization}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${doc.is_verified ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${doc.is_verified ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                            {doc.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toggleVerification('doctors', doc.id, doc.profile_id, doc.is_verified)}
                              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${doc.is_verified ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25 dark:bg-indigo-500 dark:hover:bg-indigo-600'}`}>
                              {doc.is_verified ? 'Revoke' : 'Approve'}
                            </button>
                            {!doc.is_verified && (
                              <button 
                                onClick={() => rejectApplication('doctors', doc.id)}
                                className="px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {activeTab === 'ambulances' && sortedAmbulances.map(amb => (
                      <tr key={amb.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-5">
                          <p className="font-bold text-slate-900 dark:text-white text-base">{amb.profiles?.full_name}</p>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{amb.profiles?.email}</p>
                        </td>
                        <td className="p-5">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm border border-slate-200/60 dark:border-slate-700">
                            {amb.vehicle_type} <span className="mx-2 text-slate-300 dark:text-slate-600">|</span> <span className="font-mono text-slate-500 dark:text-slate-400">{amb.vehicle_number}</span>
                          </span>
                        </td>
                        <td className="p-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${amb.is_verified ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${amb.is_verified ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                            {amb.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => toggleVerification('ambulance_providers', amb.id, amb.profile_id, amb.is_verified)}
                              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${amb.is_verified ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/25 dark:bg-indigo-500 dark:hover:bg-indigo-600'}`}>
                              {amb.is_verified ? 'Revoke' : 'Approve'}
                            </button>
                            {!amb.is_verified && (
                              <button 
                                onClick={() => rejectApplication('ambulance_providers', amb.id)}
                                className="px-4 py-2 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {(activeTab === 'doctors' && doctors.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 mb-4 text-slate-300 dark:text-slate-600">
                            <XCircle size={32} />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Doctors Found</h4>
                          <p className="text-slate-500 dark:text-slate-400 mt-1">There are no doctors registered in the system yet.</p>
                        </td>
                      </tr>
                    )}

                    {(activeTab === 'ambulances' && ambulances.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 mb-4 text-slate-300 dark:text-slate-600">
                            <XCircle size={32} />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Ambulances Found</h4>
                          <p className="text-slate-500 dark:text-slate-400 mt-1">There are no ambulance providers registered in the system yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
