import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { LogOut, User, Activity, PhoneIncoming, MessageCircle, Moon, Sun, UserCheck, Stethoscope, Mail } from 'lucide-react'
import VideoCallDialog from '@/components/VideoCallDialog'
import DoctorChatDialog from '@/components/DoctorChatDialog'

export default function DoctorDashboard() {
  const { session, user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [doctorDetails, setDoctorDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inbox' | 'profile'>('inbox')
  
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'))

  // Form states
  const [specialization, setSpecialization] = useState('')
  const [qualification, setQualification] = useState('')
  const [experience, setExperience] = useState('')
  const [clinic, setClinic] = useState('')
  const [fee, setFee] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)

  // Video call states
  const [incomingCall, setIncomingCall] = useState<{ callerId: string, targetId: string, callerName: string } | null>(null)
  const [activeVideoCall, setActiveVideoCall] = useState<{ callerId: string, targetId: string, targetName: string } | null>(null)

  // Inbox states
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    fetchProfile()

    // Listen for incoming calls
    if (user) {
      const channel = supabase.channel('global-notifications')
      channel.on('broadcast', { event: 'incoming-call' }, (payload) => {
        const { callerId, targetId, callerName } = payload.payload
        if (targetId === user.id) {
          setIncomingCall({ callerId, targetId, callerName })
        }
      }).subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

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

  const fetchProfile = async () => {
    setLoading(true)
    if (!user) return

    const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(pData)

    const { data: dData } = await supabase.from('doctors').select('*').eq('profile_id', user.id).single()
    if (dData) {
      setDoctorDetails(dData)
      setSpecialization(dData.specialization || '')
      setQualification(dData.qualification || '')
      setExperience(dData.experience_years?.toString() || '')
      setClinic(dData.clinic_hospital || '')
      setFee(dData.consultation_fee?.toString() || '')
      setIsAvailable(dData.is_available ?? true)
      
      // If profile is fully populated, default to inbox
      if (dData.specialization) {
        setActiveTab('inbox')
      } else {
        setActiveTab('profile')
      }
    } else {
      setActiveTab('profile') // Force edit if no details yet
    }

    // Fetch inbox patients
    const { data: convData } = await supabase
      .from('conversations')
      .select('*, profiles:patient_id(*)')
      .eq('doctor_id', user.id)
    if (convData) {
      setPatients(convData.map(c => c.profiles))
    }

    setLoading(false)
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    // Auto-fetch location if possible
    let lat = null
    let lng = null
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
      lat = pos.coords.latitude
      lng = pos.coords.longitude
    } catch(err) {
      console.warn("Could not get location")
    }

    const payload = {
      profile_id: user.id,
      specialization,
      qualification,
      experience_years: parseInt(experience) || 0,
      clinic_hospital: clinic,
      consultation_fee: parseFloat(fee) || 0,
      is_available: isAvailable,
      ...(lat && lng ? { location_lat: lat, location_lng: lng } : {})
    }

    let result
    if (doctorDetails) {
      result = await supabase.from('doctors').update(payload).eq('id', doctorDetails.id)
    } else {
      result = await supabase.from('doctors').insert([payload])
    }

    if (result.error) {
      toast.error(result.error.message)
    } else {
      toast.success("Profile saved successfully!")
      fetchProfile()
    }
  }

  const toggleOnlineStatus = async () => {
    if (!doctorDetails) {
      toast.error("Please save your professional details first!")
      return
    }
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    
    const { error } = await supabase.from('doctors').update({ is_available: newStatus }).eq('id', doctorDetails.id)
    if (error) {
      setIsAvailable(!newStatus) // Revert on error
      toast.error("Failed to update status")
    } else {
      toast.success(`You are now ${newStatus ? 'ONLINE' : 'OFFLINE'}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">Loading Doctor Profile...</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between sticky top-0 h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300">
        <div>
          <div className="p-8 pb-4">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-3 tracking-tight">
              <Stethoscope className="text-indigo-600 dark:text-indigo-400" size={36} /> MedoDoctor
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 ml-1">Provider Portal</p>
          </div>

          <div className="px-8 pb-6 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex flex-col gap-2">
              <p className="font-bold text-slate-900 dark:text-white">Dr. {profile?.full_name}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {isAvailable ? '🟢 ONLINE' : '⚫ OFFLINE'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer ml-auto">
                  <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={toggleOnlineStatus} />
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                </label>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Workspace</p>
            <button 
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'inbox' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Mail size={20} />
              Patient Inbox 
              {patients.length > 0 && <span className="ml-auto bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">{patients.length}</span>}
            </button>

            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <UserCheck size={20} />
              My Profile
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
      <main className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 relative overflow-x-hidden overflow-y-auto transition-colors duration-300">
        
        {/* Dynamic Abstract Background Elements */}
        <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-8 py-12 relative z-10 space-y-10">
          
          <div className="flex justify-between items-end mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome, Dr. {profile?.full_name}</h2>
              <div className="flex items-center gap-3">
                {doctorDetails?.is_verified ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Verified Practitioner
                  </span>
                ) : (
                   <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Pending Admin Verification
                  </span>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'inbox' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500 transition-colors">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center"><MessageCircle size={20}/></span> 
                  Patient Inbox
                </h3>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patients.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setSelectedPatient(p); setChatOpen(true); }}
                      className="group flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-black text-xl">
                          {p.full_name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.full_name}</h4>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{p.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                         <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <MessageCircle size={16} /> Open Consultation
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
                {patients.length === 0 && (
                  <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <MessageCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Inbox Empty</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">You don't have any active patient consultations yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-800 p-8 md:p-12 animate-in fade-in duration-500 transition-colors">
              <h3 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
                 <UserCheck className="text-indigo-600 dark:text-indigo-400" size={28} /> Edit Professional Details
              </h3>
              
              <form onSubmit={saveProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Specialization</label>
                    <input required type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" placeholder="e.g. Cardiologist" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Qualification</label>
                    <input required type="text" value={qualification} onChange={e => setQualification(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" placeholder="e.g. MBBS, MD" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Experience (Years)</label>
                    <input required type="number" value={experience} onChange={e => setExperience(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Consultation Fee (₹)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 font-bold">₹</span>
                      <input required type="number" value={fee} onChange={e => setFee(e.target.value)} className="w-full pl-8 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Clinic / Hospital Name</label>
                    <input required type="text" value={clinic} onChange={e => setClinic(e.target.value)} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-start gap-3">
                   <Activity className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={20} />
                   <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Your location will be automatically captured via GPS when you save to help patients find you on the Live Map.</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="submit" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] font-black text-lg">
                    Save Profile & Publish
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Doctor Chat Modal */}
      {selectedPatient && (
        <DoctorChatDialog 
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          currentUserId={user?.id || ''}
          patientId={selectedPatient.id}
          patientName={selectedPatient.full_name}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-slate-900 border border-slate-700 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-bl-full -z-10 blur-[40px]"></div>
             <div className="w-28 h-28 bg-indigo-500/20 rounded-full flex items-center justify-center mb-8">
                <div className="w-20 h-20 bg-indigo-500/40 rounded-full flex items-center justify-center animate-pulse">
                   <PhoneIncoming size={40} className="text-indigo-300 animate-bounce" />
                </div>
             </div>
             <h3 className="text-3xl font-black mb-2 text-center tracking-tight">Incoming Call</h3>
             <p className="text-slate-400 mb-10 text-center font-medium"><span className="text-white font-bold">{incomingCall.callerName}</span> is calling for an emergency video consultation...</p>
             <div className="flex gap-4 w-full">
               <button 
                 onClick={() => setIncomingCall(null)}
                 className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-bold hover:bg-red-600 transition-colors">
                 Decline
               </button>
               <button 
                 onClick={() => {
                   setActiveVideoCall({ callerId: incomingCall.callerId, targetId: incomingCall.targetId, targetName: incomingCall.callerName })
                   setIncomingCall(null)
                 }}
                 className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-black hover:bg-green-400 shadow-lg shadow-green-500/30 transition-all hover:scale-105 active:scale-95">
                 Accept
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Active Video Call */}
      {activeVideoCall && (
        <VideoCallDialog 
          isOpen={true}
          onClose={() => setActiveVideoCall(null)}
          isCaller={false}
          currentUserId={user?.id || ''}
          targetUserId={activeVideoCall.callerId}
          targetName={activeVideoCall.targetName}
        />
      )}
    </div>
  )
}
