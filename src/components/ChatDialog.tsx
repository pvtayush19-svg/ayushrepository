import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Video, Ambulance } from 'lucide-react'
import { toast } from 'sonner'
import Chat from './Chat'
import VideoCallDialog from './VideoCallDialog'

export default function ChatDialog({ isOpen, onClose, currentUserId, doctorId, doctorName }: { isOpen: boolean, onClose: () => void, currentUserId: string, doctorId: string, doctorName: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    if (isOpen) initConversation()
  }, [isOpen])

  const requestDoctorAmbulance = async () => {
    if (isBooking) return;
    setIsBooking(true);
    try {
      const { data: provider, error: providerErr } = await supabase
        .from('ambulance_providers')
        .select('id')
        .eq('associated_doctor_id', doctorId)
        .single();

      if (providerErr || !provider) {
        toast.error("This doctor/hospital doesn't have a personal ambulance registered.");
        setIsBooking(false);
        return;
      }

      if (!navigator.geolocation) {
        toast.error("Location not supported by browser.");
        setIsBooking(false);
        return;
      }

      const toastId = toast.loading("Booking doctor's ambulance...");

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const { error: bookingErr } = await supabase
            .from('ambulance_bookings')
            .insert([{
              patient_id: currentUserId,
              ambulance_id: provider.id,
              pickup_lat: latitude,
              pickup_lng: longitude,
              status: 'pending'
            }]);
          
          if (bookingErr) {
            toast.error("Error booking ambulance: " + bookingErr.message, { id: toastId });
          } else {
            toast.success("Ambulance requested successfully! You can track it on your dashboard.", { id: toastId });
            onClose(); // Optional: close chat or let them stay
          }
          setIsBooking(false);
        },
        (err) => {
          toast.error("Failed to get location: " + err.message, { id: toastId });
          setIsBooking(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      setIsBooking(false);
    }
  };

  const initConversation = async () => {
    // Check if conversation exists
    let { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', currentUserId)
      .eq('doctor_id', doctorId)
      .single()
    
    if (data) {
      setConversationId(data.id)
    } else {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{ patient_id: currentUserId, doctor_id: doctorId }])
        .select()
        .single()
      
      if (newConv) setConversationId(newConv.id)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg h-[600px] overflow-hidden flex flex-col border dark:border-slate-800">
        <div className="bg-gradient-to-r from-primary to-blue-600 dark:from-indigo-900 dark:to-blue-900 text-white p-4 flex justify-between items-center shadow-md z-10">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-full">
                <span className="text-xl">👨‍⚕️</span>
             </div>
             <div>
               <h3 className="font-bold text-lg leading-tight">Dr. {doctorName}</h3>
               <p className="text-white/70 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online</p>
             </div>
          </div>
          <div className="flex items-center gap-2">

            <button 
              onClick={() => setIsVideoCallActive(true)} 
              className="hover:bg-white/20 p-2 rounded-full transition-colors flex items-center gap-2 border border-transparent hover:border-white/30"
              title="Start Video Call">
              <Video size={20} />
            </button>
            <button onClick={onClose} className="hover:bg-red-500/80 p-2 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>
        <div className="flex-1 bg-slate-50 dark:bg-slate-900 relative flex flex-col">
          {conversationId ? (
             <div className="flex-1 relative">
               <Chat conversationId={conversationId} currentUserId={currentUserId} />
             </div>
          ) : (
             <div className="flex-1 flex items-center justify-center">
               <div className="animate-pulse flex flex-col items-center">
                 <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-500">Loading secure chat...</p>
               </div>
             </div>
          )}
          <div className="bg-red-50 dark:bg-red-900/20 p-3 border-t border-red-100 dark:border-red-900/50 flex flex-row justify-between items-center gap-4">
             <div className="text-sm text-red-800 dark:text-red-300 font-medium leading-tight">
               <span className="font-bold block">Emergency?</span>
               Book Dr. {doctorName}'s personal ambulance
             </div>
             <button 
               onClick={requestDoctorAmbulance} 
               disabled={isBooking}
               className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-red-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shrink-0">
               <Ambulance size={18}/> 
               {isBooking ? 'Booking...' : 'Book Now'}
             </button>
          </div>
        </div>
      </div>
      
      {/* Video Call Overlay */}
      {isVideoCallActive && (
        <VideoCallDialog 
          isOpen={isVideoCallActive}
          onClose={() => setIsVideoCallActive(false)}
          isCaller={true}
          currentUserId={currentUserId}
          targetUserId={doctorId}
          targetName={`Dr. ${doctorName}`}
        />
      )}
    </div>
  )
}
