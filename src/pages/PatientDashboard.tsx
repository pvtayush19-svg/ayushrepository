import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Map from '@/components/Map'
import { LogOut, Search, MapPin, MessageCircle, AlertCircle, Ambulance, Activity, Moon, Sun, Stethoscope, Menu, X, PhoneIncoming } from 'lucide-react'
import ChatDialog from '@/components/ChatDialog'
import VideoCallDialog from '@/components/VideoCallDialog'

export default function PatientDashboard() {
  const { session, user } = useAuth()
  const [activeTab, setActiveTab] = useState<'doctors' | 'ambulances' | 'map'>('doctors')
  const [doctors, setDoctors] = useState<any[]>([])
  const [ambulances, setAmbulances] = useState<any[]>([])
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null)
  
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  
  const [activeBooking, setActiveBooking] = useState<any>(null)
  const [selectedAmbulance, setSelectedAmbulance] = useState<any>(null)
  
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Video call states
  const [incomingCall, setIncomingCall] = useState<{ callerId: string, targetId: string, callerName: string } | null>(null)
  const [activeVideoCall, setActiveVideoCall] = useState<{ callerId: string, targetId: string, targetName: string } | null>(null)

  useEffect(() => {
    // Continuously track user's current location
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        (err) => {
          console.error(err)
          if (!location) {
             toast.error("Location access denied. Some features might not work optimally.")
             // Default to a generic location or ask manual
             setLocation({ lat: 20.5937, lng: 78.9629 }) // Default to India center
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      )
    }

    fetchDoctors()
    fetchAmbulances()
    if (user) fetchActiveBooking()
    
    // Subscribe to booking updates
    let bookingSub: any;
    if (user) {
      bookingSub = supabase
        .channel('public:ambulance_bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_bookings', filter: `patient_id=eq.${user.id}` }, payload => {
           if (payload.eventType === 'DELETE' || payload.new.status === 'completed' || payload.new.status === 'cancelled') {
             setActiveBooking(null)
             toast.info("Ambulance booking has ended.")
           } else {
             setActiveBooking(payload.new)
             if (payload.new.status === 'accepted') toast.success("Ambulance has accepted your request!")
             if (payload.new.status === 'en_route') toast.success("Ambulance is en route!")
           }
        })
        .subscribe()
    }

    // Listen for incoming calls
    let callChannel: any;
    if (user) {
      callChannel = supabase.channel('global-notifications')
      callChannel.on('broadcast', { event: 'incoming-call' }, (payload: any) => {
        const { callerId, targetId, callerName } = payload.payload
        if (targetId === user.id) {
          setIncomingCall({ callerId, targetId, callerName })
        }
      }).subscribe()
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
      if (bookingSub) supabase.removeChannel(bookingSub)
      if (callChannel) supabase.removeChannel(callChannel)
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

  const fetchActiveBooking = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('ambulance_bookings')
      .select('*, ambulance_providers(*, profiles(*))')
      .eq('patient_id', user.id)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .maybeSingle()
    
    if (data) setActiveBooking(data)
  }

  const fetchDoctors = async () => {
    const { data, error } = await supabase
      .from('doctors')
      .select('*, profiles:profile_id(full_name, avatar_url, email)')
      .eq('is_verified', true)
    
    if (error) console.error(error)
    else setDoctors(data || [])
  }

  const fetchAmbulances = async () => {
    const { data, error } = await supabase
      .from('ambulance_providers')
      .select('*, profiles:profile_id(full_name, avatar_url, email)')
      .eq('is_verified', true)
      .eq('is_available', true)
    
    if (error) console.error(error)
    else setAmbulances(data || [])
  }

  const handleBookAmbulance = async () => {
    if (!user || !selectedAmbulance) return
    if (!location) {
      toast.error("Waiting for GPS location...")
      return
    }

    const { data, error } = await supabase.from('ambulance_bookings').insert([{
      patient_id: user.id,
      ambulance_id: selectedAmbulance.id,
      pickup_lat: location.lat,
      pickup_lng: location.lng,
      status: 'pending'
    }]).select().single()

    if (error) {
      toast.error("Error booking ambulance: " + error.message)
    } else {
      toast.success("Ambulance requested successfully!")
      fetchActiveBooking()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-500/30 transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full object-cover" /> MedoPatient
        </h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex fixed md:sticky top-[73px] md:top-0 left-0 w-full md:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between h-[calc(100vh-73px)] md:h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300 overflow-y-auto`}>
        <div>
          <div className="p-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center gap-3 tracking-tight">
              <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" /> MedoPatient
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 ml-1">Personal Health Portal</p>
          </div>

          <div className="px-8 pb-4">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full w-fit">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               {user?.user_metadata?.full_name || 'Patient'}
             </div>
          </div>

          <nav className="px-4 mt-2 space-y-2">
            <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 mt-4">Services</p>
            <button 
              onClick={() => { setActiveTab('doctors'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'doctors' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Stethoscope size={20} />
              Find Doctors 
            </button>

            <button 
              onClick={() => { setActiveTab('ambulances'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'ambulances' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <span className="flex items-center gap-3"><AlertCircle size={20} /> Ambulance</span>
              {activeBooking && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>

            <button 
              onClick={() => { setActiveTab('map'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'map' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <MapPin size={20} />
              Live Map 
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
        <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12 relative z-10 space-y-6 md:space-y-10">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600/10 dark:from-blue-900/40 via-cyan-500/10 dark:via-cyan-900/20 to-transparent p-10 rounded-[2.5rem] border border-blue-500/10 dark:border-blue-800/30 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <img src="/logo.jpg" alt="Background Logo" className="w-48 h-48 rounded-full object-cover grayscale blur-sm" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3">Hello, {user?.user_metadata?.full_name || 'Patient'}!</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-lg font-medium">Find specialized doctors, request emergency ambulances, and track live locations all from your personal health dashboard.</p>
          </div>

          {activeTab === 'doctors' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/60 dark:border-slate-800 flex gap-4 items-center focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-300">
                <Search className="text-slate-400 dark:text-slate-500 ml-2" size={24} />
                <input type="text" placeholder="Search for doctors by name or specialization..." className="w-full text-lg border-none focus:outline-none focus:ring-0 bg-transparent placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white font-medium" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {doctors.map(doc => (
                  <div key={doc.id} className="bg-white dark:bg-slate-900 p-8 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-900/20 hover:border-blue-500/30 dark:hover:border-blue-500/50 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 dark:from-blue-900/20 to-transparent pointer-events-none rounded-tr-[2rem]"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                           <Stethoscope size={28} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-1 rounded-full">{doc.experience_years} YRS EXP</span>
                          {doc.is_available ? (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200 dark:border-green-800 shadow-sm"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> ONLINE</span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">OFFLINE</span>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-2xl text-slate-900 dark:text-white mb-1">Dr. {doc.profiles?.full_name}</h3>
                      <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mb-6">{doc.specialization}</p>
                      
                      <div className="space-y-3 mb-8">
                         <p className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-3 font-medium"><MapPin size={18} className="text-slate-400"/> {doc.clinic_hospital}</p>
                         <p className="text-slate-600 dark:text-slate-400 text-sm flex items-center gap-3">
                           <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">₹{doc.consultation_fee}</span> <span className="font-medium">Consultation Fee</span>
                         </p>
                      </div>
                    </div>
                    
                    <button 
                      disabled={!doc.is_available}
                      onClick={() => { setSelectedDoctor(doc); setChatOpen(true); }}
                      className={`w-full relative z-10 text-center font-bold py-4 rounded-2xl border flex items-center justify-center gap-2 transition-all duration-300 ${doc.is_available ? 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/20' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'}`}>
                      <MessageCircle size={20} /> {doc.is_available ? 'Start Consultation' : 'Currently Offline'}
                    </button>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-900 p-16 text-center rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No verified doctors found nearby.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ambulances' && (
            <div className="animate-in fade-in duration-500">
              {activeBooking ? (
                <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-red-500/5 border border-red-200 dark:border-red-900/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center">
                          <AlertCircle className="animate-pulse" size={32} /> 
                        </div>
                        Active Emergency Request
                      </h2>
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400 font-medium text-lg">Status:</span> 
                        <span className="font-bold text-red-600 dark:text-red-400 uppercase bg-red-50 dark:bg-red-900/30 px-4 py-1.5 rounded-xl border border-red-200 dark:border-red-800">{activeBooking.status === 'en_route' ? 'on route' : activeBooking.status}</span>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (activeBooking.status === 'en_route') {
                          toast.error("Ambulance is on the way and cannot be cancelled now.");
                          return;
                        }
                        const { error } = await supabase.from('ambulance_bookings').update({status: 'cancelled'}).eq('id', activeBooking.id);
                        if (error) toast.error(error.message);
                        else {
                          toast.success("Emergency request cancelled.");
                          fetchActiveBooking();
                        }
                      }} 
                      className="bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
                    >
                      Cancel Request
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/50">
                      <h3 className="font-black text-2xl mb-6 text-slate-900 dark:text-white">Tracking Information</h3>
                      <div className="space-y-5">
                         <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                           <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-2xl"><Ambulance size={28} /></div>
                           <div>
                             <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Assigned Provider</p>
                             <p className="font-black text-xl text-slate-900 dark:text-white">{activeBooking.ambulance_providers?.profiles?.full_name || 'Loading...'}</p>
                             <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800 w-fit px-2 py-0.5 rounded-lg">{activeBooking.ambulance_providers?.vehicle_number}</p>
                           </div>
                         </div>
                         {activeBooking.status === 'pending' && (
                           <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-500 rounded-2xl font-bold flex items-center gap-3">
                             <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shrink-0"></span> Waiting for provider to accept...
                           </div>
                         )}
                         {activeBooking.status === 'en_route' && (
                           <div className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-500 rounded-2xl font-bold flex items-center gap-3">
                             <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shrink-0"></span> Ambulance is on the way! Stay calm and keep your phone nearby.
                           </div>
                         )}
                      </div>
                    </div>
                    <div className="h-[400px] lg:h-auto">
                      <Map 
                        center={location || { lat: 20.5937, lng: 78.9629 }} 
                        className="h-full w-full rounded-[2rem] border-[6px] border-slate-100 dark:border-slate-800 shadow-inner"
                        markers={[
                          ...(location ? [{ id: 'user', lat: location.lat, lng: location.lng, title: 'Pickup Location', type: 'user' as const }] : []),
                          ...(activeBooking.ambulance_providers?.location_lat ? [{ id: 'amb', lat: activeBooking.ambulance_providers.location_lat, lng: activeBooking.ambulance_providers.location_lng, title: 'Ambulance', type: 'ambulance' as const }] : [])
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-red-100 dark:border-red-900/30 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-red-50 dark:bg-red-900/10 rounded-bl-[100px] -z-10 transition-colors"></div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Emergency</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Select a nearby ambulance to request immediate dispatch.</p>
                    
                    {selectedAmbulance ? (
                      <div className="space-y-6 animate-in slide-in-from-right-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-6 rounded-3xl mb-6">
                            <h4 className="font-black text-xl text-slate-900 dark:text-white mb-1">{selectedAmbulance.profiles?.full_name}</h4>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">{selectedAmbulance.vehicle_type} • <span className="font-mono">{selectedAmbulance.vehicle_number}</span></p>
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 w-fit px-3 py-1.5 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Available
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Your GPS Pickup Location</label>
                            <div className="relative">
                               <MapPin className="absolute left-4 top-4 text-red-500" size={20} />
                               <input type="text" value={location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Locating...'} className="w-full pl-12 pr-4 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all" readOnly />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 mt-8">
                          <button onClick={handleBookAmbulance} disabled={!location} className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50">
                            <AlertCircle size={24} /> BOOK AMBULANCE
                          </button>
                          <button onClick={() => setSelectedAmbulance(null)} className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                            Cancel Selection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-center px-6 transition-colors">
                         <Ambulance size={56} className="mb-4 opacity-50" />
                         <p className="font-medium text-lg">Select an ambulance from the list to view details and book.</p>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-800 h-full transition-colors">
                      <h3 className="font-black text-2xl mb-8 flex items-center gap-4 text-slate-900 dark:text-white">
                        <span className="w-12 h-12 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center"><Ambulance size={24}/></span> Active Ambulances
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {ambulances.map(amb => (
                           <div 
                             key={amb.id} 
                             onClick={() => setSelectedAmbulance(amb)}
                             className={`p-6 border rounded-[2rem] flex flex-col justify-between cursor-pointer transition-all duration-300 ${selectedAmbulance?.id === amb.id ? 'bg-red-50 dark:bg-red-900/10 border-red-500 ring-4 ring-red-500/10 shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md hover:bg-white dark:hover:bg-slate-800'}`}>
                              <div className="mb-6">
                                <p className="font-black text-xl text-slate-900 dark:text-white mb-2">{amb.profiles?.full_name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-3">
                                  {amb.vehicle_type} <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span> <span className="font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300">{amb.vehicle_number}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/30 w-fit px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800/50">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Available Now
                              </div>
                           </div>
                        ))}
                        {ambulances.length === 0 && (
                           <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 font-medium text-lg">
                             No available ambulances nearby.
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-800 animate-in zoom-in-95 duration-500 transition-colors">
              <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4">
                  <span className="w-14 h-14 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center"><MapPin size={28}/></span> Global Live Map
                </h2>
                <div className="flex flex-wrap gap-4 text-sm font-bold bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2"><span className="text-xl">👤</span> You</span>
                  <span className="flex items-center gap-2"><span className="text-xl">👨‍⚕️</span> Doctors</span>
                  <span className="flex items-center gap-2"><span className="text-xl">🚑</span> Ambulances</span>
                </div>
              </div>
              <Map 
                className="h-[400px] md:h-[700px] w-full rounded-[2rem] border-[6px] border-slate-50 dark:border-slate-800 shadow-inner"
                center={location || { lat: 20.5937, lng: 78.9629 }} 
                markers={[
                  ...(location ? [{
                    id: 'user',
                    lat: location.lat,
                    lng: location.lng,
                    title: 'You are here',
                    subtitle: 'Your live GPS location',
                    type: 'user' as const
                  }] : []),
                  ...doctors.filter(d => d.location_lat && d.location_lng).map(d => ({
                    id: `doc-${d.id}`,
                    lat: d.location_lat,
                    lng: d.location_lng,
                    title: `Dr. ${d.profiles?.full_name}`,
                    subtitle: `${d.specialization} • ${d.clinic_hospital}`,
                    type: 'doctor' as const
                  })),
                  ...ambulances.filter(a => a.location_lat && a.location_lng).map(a => ({
                    id: `amb-${a.id}`,
                    lat: a.location_lat,
                    lng: a.location_lng,
                    title: `Ambulance: ${a.profiles?.full_name}`,
                    subtitle: `${a.vehicle_type} • ${a.vehicle_number}`,
                    type: 'ambulance' as const
                  }))
                ]}
              />
            </div>
          )}
        </div>
      </main>

      {selectedDoctor && user && (
        <ChatDialog 
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)} 
          currentUserId={user.id} 
          doctorId={selectedDoctor.profile_id} 
          doctorName={selectedDoctor.profiles?.full_name} 
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in duration-300">
          <div className="bg-slate-900 border border-slate-700 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-full text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full -z-10 blur-[40px]"></div>
             <div className="w-28 h-28 bg-blue-500/20 rounded-full flex items-center justify-center mb-8">
                <div className="w-20 h-20 bg-blue-500/40 rounded-full flex items-center justify-center animate-pulse">
                   <PhoneIncoming size={40} className="text-blue-300 animate-bounce" />
                </div>
             </div>
             <h3 className="text-3xl font-black mb-2 text-center tracking-tight">Incoming Call</h3>
             <p className="text-slate-400 mb-10 text-center font-medium"><span className="text-white font-bold">{incomingCall.callerName}</span> is calling for a video consultation...</p>
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
