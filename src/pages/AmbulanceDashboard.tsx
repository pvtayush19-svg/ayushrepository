import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { LogOut, Ambulance, Activity, Moon, Sun, AlertCircle, Settings, Navigation, Clock, Menu, X } from 'lucide-react'

export default function AmbulanceDashboard() {
  const { session, user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [providerDetails, setProviderDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'emergencies' | 'vehicle' | 'history'>('emergencies')
  
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Form states
  const [vehicleType, setVehicleType] = useState('Basic Life Support (BLS)')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)

  const [activeRequests, setActiveRequests] = useState<any[]>([])
  const [historyRequests, setHistoryRequests] = useState<any[]>([])
  const [tripFares, setTripFares] = useState<{[key: string]: string}>({})

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    let watchId: number;
    if (isAvailable && user && providerDetails && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
           await supabase.from('ambulance_providers').update({
             location_lat: pos.coords.latitude,
             location_lng: pos.coords.longitude
           }).eq('id', providerDetails.id)
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [isAvailable, user, providerDetails])

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

    const { data: aData } = await supabase.from('ambulance_providers').select('*').eq('profile_id', user.id).single()
    if (aData) {
      setProviderDetails(aData)
      setVehicleType(aData.vehicle_type || 'Basic Life Support (BLS)')
      setVehicleNumber(aData.vehicle_number || '')
      setIsAvailable(aData.is_available || false)
      
      if (aData.vehicle_number) {
        setActiveTab('emergencies')
      } else {
        setActiveTab('vehicle')
      }
      fetchActiveRequests(aData.id)
      fetchHistoryRequests(aData.id)
    } else {
      setActiveTab('vehicle')
    }
    setLoading(false)
  }

  const fetchActiveRequests = async (ambulanceId: string) => {
    const { data } = await supabase
      .from('ambulance_bookings')
      .select('*, profiles:patient_id(*)')
      .eq('ambulance_id', ambulanceId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
    
    if (data) setActiveRequests(data)
  }

  const fetchHistoryRequests = async (ambulanceId: string) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ambulance_bookings')
      .select('*, profiles:patient_id(*)')
      .eq('ambulance_id', ambulanceId)
      .in('status', ['completed', 'cancelled'])
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
    
    if (data) setHistoryRequests(data)
  }

  useEffect(() => {
    if (!providerDetails?.id) return
    
    const sub = supabase
      .channel('public:ambulance_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulance_bookings', filter: `ambulance_id=eq.${providerDetails.id}` }, payload => {
        fetchActiveRequests(providerDetails.id)
        fetchHistoryRequests(providerDetails.id)
        if (payload.eventType === 'INSERT') {
          toast.error("🚨 NEW EMERGENCY REQUEST 🚨") // Uses error color for high visibility
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [providerDetails?.id])

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
      vehicle_type: vehicleType,
      vehicle_number: vehicleNumber,
      is_available: isAvailable,
      ...(lat && lng ? { location_lat: lat, location_lng: lng } : {})
    }

    let result
    if (providerDetails) {
      result = await supabase.from('ambulance_providers').update(payload).eq('id', providerDetails.id)
    } else {
      result = await supabase.from('ambulance_providers').insert([payload])
    }

    if (result.error) {
      toast.error(result.error.message)
    } else {
      toast.success("Vehicle details saved successfully!")
      fetchProfile()
    }
  }

  const toggleOnlineStatus = async () => {
    if (!providerDetails) {
      toast.error("Please save your vehicle details first!")
      return
    }
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    
    const { error } = await supabase.from('ambulance_providers').update({ is_available: newStatus }).eq('id', providerDetails.id)
    if (error) {
      setIsAvailable(!newStatus)
      toast.error("Failed to update status")
    } else {
      toast.success(`You are now ${newStatus ? 'ONLINE' : 'OFFLINE'}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">Loading Provider Portal...</div>

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-800 dark:text-slate-100 font-sans selection:bg-red-500/30 transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <h1 className="text-xl font-black bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-500 dark:to-orange-400 bg-clip-text text-transparent flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full object-cover" /> MedoRescue
        </h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex fixed md:sticky top-[73px] md:top-0 left-0 w-full md:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between h-[calc(100vh-73px)] md:h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300 overflow-y-auto`}>
        <div>
          <div className="p-8 pb-4">
            <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-500 dark:to-orange-400 bg-clip-text text-transparent flex items-center gap-3 tracking-tight">
              <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover" /> MedoRescue
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 ml-1">Ambulance Command Center</p>
          </div>

          <div className="px-8 pb-6 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex flex-col gap-2">
              <p className="font-bold text-slate-900 dark:text-white">{profile?.full_name}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isAvailable ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {isAvailable ? '🟢 ON DUTY' : '⚫ OFF DUTY'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer ml-auto">
                  <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={toggleOnlineStatus} />
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
                </label>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Dispatch</p>
            <button 
              onClick={() => { setActiveTab('emergencies'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'emergencies' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm shadow-red-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Activity size={20} />
              Emergencies
              {activeRequests.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{activeRequests.length}</span>}
            </button>

            <button 
              onClick={() => { setActiveTab('vehicle'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'vehicle' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm shadow-red-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Settings size={20} />
              Vehicle Settings
            </button>

            <button 
              onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'history' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 shadow-sm shadow-red-100 dark:shadow-none' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Clock size={20} />
              Ride History
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
        <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] bg-red-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-400/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-12 relative z-10 space-y-6 md:space-y-10">
          
          <div className="flex justify-between items-end mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Command Center</h2>
              <div className="flex items-center gap-3 mt-4">
                {providerDetails?.is_verified ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Verified Fleet Provider
                  </span>
                ) : (
                   <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-800">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> Pending Admin Verification
                  </span>
                )}
              </div>
            </div>
            
            {activeRequests.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-bold border border-red-200 dark:border-red-800 animate-pulse">
                <AlertCircle size={20} /> {activeRequests.length} Active Emergency
              </div>
            )}
          </div>

          {activeTab === 'emergencies' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {activeRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-lg shadow-red-500/5 dark:shadow-red-900/10 border-2 border-red-100 dark:border-red-900/40 relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase flex items-center gap-2 border border-red-200 dark:border-red-800/50">
                           <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Emergency Dispatch
                        </span>
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">{req.status === 'en_route' ? 'In Route' : req.status}</span>
                      </div>
                      <h4 className="font-black text-2xl text-slate-900 dark:text-white mb-1">{req.profiles?.full_name}</h4>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-2">
                        <Navigation size={16} className="text-red-500" />
                        Lat: {req.pickup_lat?.toFixed(4)}, Lng: {req.pickup_lng?.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative z-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-bold uppercase tracking-wider">Action Controls</p>
                     
                     <div className="flex flex-col sm:flex-row gap-4">
                        {req.status === 'pending' && (
                          <button onClick={() => supabase.from('ambulance_bookings').update({status: 'accepted'}).eq('id', req.id).then(({error}) => { if(error) toast.error(error.message); else { toast.success('Accepted!'); fetchActiveRequests(providerDetails.id); } })} className="flex-1 bg-green-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-green-500/30 hover:bg-green-400 transition-all hover:scale-[1.02] active:scale-95">
                            Accept Dispatch
                          </button>
                        )}
                        {req.status === 'accepted' && (
                          <button onClick={() => supabase.from('ambulance_bookings').update({status: 'en_route'}).eq('id', req.id).then(({error}) => { if(error) toast.error(error.message); else { toast.success('In Route!'); fetchActiveRequests(providerDetails.id); } })} className="flex-1 bg-blue-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-all hover:scale-[1.02] active:scale-95">
                            Mark In Route
                          </button>
                        )}
                        {req.status === 'en_route' && (
                          <div className="flex flex-col sm:flex-row gap-4 w-full">
                            <div className="relative flex-1">
                              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 dark:text-slate-400 font-bold">₹</span>
                              <input 
                                type="number" 
                                placeholder="Enter Final Fare Amount" 
                                value={tripFares[req.id] || ''} 
                                onChange={e => setTripFares({...tripFares, [req.id]: e.target.value})}
                                className="w-full pl-10 pr-4 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-slate-800 dark:focus:border-slate-400 transition-colors" 
                              />
                            </div>
                            <button 
                              disabled={!tripFares[req.id]}
                              onClick={() => {
                                if (!tripFares[req.id]) return;
                                supabase.from('ambulance_bookings').update({status: 'completed', fare: Number(tripFares[req.id])}).eq('id', req.id).then(({error}) => {
                                  if (error) {
                                    toast.error("Failed to complete ride");
                                  } else {
                                    toast.success("Ride completed and fare recorded!");
                                    fetchActiveRequests(providerDetails?.id);
                                  }
                                });
                              }} 
                              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-black text-lg shadow-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95">
                              Complete Ride
                            </button>
                          </div>
                        )}
                        {(req.status === 'pending' || req.status === 'accepted') && (
                          <button onClick={() => supabase.from('ambulance_bookings').update({status: 'cancelled'}).eq('id', req.id).then(({error}) => { if(error) toast.error(error.message); else { toast.success('Cancelled'); fetchActiveRequests(providerDetails.id); } })} className="sm:w-32 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-4 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 transition-all active:scale-95">
                            Cancel
                          </button>
                        )}
                     </div>
                  </div>
                </div>
              ))}
              {activeRequests.length === 0 && (
                <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
                    <Activity size={36} />
                  </div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Active Dispatch Requests</h4>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Keep your status online to receive incoming emergency calls.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-800 p-6 md:p-12 animate-in fade-in duration-500 transition-colors">
              <h3 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
                 <Settings className="text-red-600 dark:text-red-500" size={28} /> Edit Vehicle Configuration
              </h3>
              
              <form onSubmit={saveProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Vehicle Type Classification</label>
                    <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="w-full px-4 py-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all appearance-none cursor-pointer">
                      <option>Basic Life Support (BLS)</option>
                      <option>Advanced Life Support (ALS)</option>
                      <option>Patient Transport Vehicle</option>
                      <option>Mortuary Ambulance</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Vehicle Registration Number</label>
                    <input required type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="w-full px-4 py-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all font-mono uppercase tracking-wider" placeholder="e.g. MH-12-AB-1234" />
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-3">
                   <Navigation className="text-red-600 dark:text-red-500 shrink-0 mt-0.5" size={20} />
                   <p className="text-sm font-medium text-red-800 dark:text-red-300">Your live GPS location will be broadcasted to patients on the map while you are marked as "ON DUTY".</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="submit" className="w-full sm:w-auto px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] font-black text-lg">
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500 transition-colors">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  <span className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center"><Navigation size={24}/></span> 
                  Past 24H Ride History
                </h3>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 gap-4">
                  {historyRequests.map(req => (
                    <div 
                      key={req.id} 
                      className="group flex flex-col sm:flex-row justify-between sm:items-center p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl ${req.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                          {req.profiles?.full_name?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">{req.profiles?.full_name}</h4>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {new Date(req.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${req.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                           {req.status}
                         </span>
                         {req.status === 'completed' && req.fare && (
                           <span className="font-black text-xl text-slate-900 dark:text-white">
                             ₹{req.fare}
                           </span>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
                {historyRequests.length === 0 && (
                  <div className="py-16 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">No History Yet</h4>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">You haven't completed or cancelled any rides in the last 24 hours.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
