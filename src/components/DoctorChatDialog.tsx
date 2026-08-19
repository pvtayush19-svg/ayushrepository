import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Video } from 'lucide-react'
import Chat from './Chat'
import VideoCallDialog from './VideoCallDialog'

export default function DoctorChatDialog({ isOpen, onClose, currentUserId, patientId, patientName }: { isOpen: boolean, onClose: () => void, currentUserId: string, patientId: string, patientName: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isVideoCallActive, setIsVideoCallActive] = useState(false)

  useEffect(() => {
    if (isOpen) initConversation()
  }, [isOpen])

  const initConversation = async () => {
    // Check if conversation exists
    let { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', currentUserId)
      .single()
    
    if (data) {
      setConversationId(data.id)
    } else {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{ patient_id: patientId, doctor_id: currentUserId }])
        .select()
        .single()
      
      if (newConv) setConversationId(newConv.id)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg h-[600px] overflow-hidden flex flex-col border dark:border-slate-800">
        <div className="bg-slate-800 dark:bg-slate-950 text-white p-4 flex justify-between items-center shadow-md z-10 border-b dark:border-slate-800">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-full">
                <span className="text-xl">👤</span>
             </div>
             <div>
               <h3 className="font-bold text-lg leading-tight">{patientName}</h3>
               <p className="text-white/70 text-xs flex items-center gap-1">Patient Chat</p>
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
        <div className="flex-1 bg-slate-50 dark:bg-slate-900 relative">
          {conversationId ? (
             <div className="absolute inset-0">
               <Chat conversationId={conversationId} currentUserId={currentUserId} />
             </div>
          ) : (
             <div className="h-full flex items-center justify-center">
               <div className="animate-pulse flex flex-col items-center">
                 <div className="w-8 h-8 border-4 border-slate-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-500">Loading secure chat...</p>
               </div>
             </div>
          )}
        </div>
      </div>
      
      {/* Video Call Overlay */}
      {isVideoCallActive && (
        <VideoCallDialog 
          isOpen={isVideoCallActive}
          onClose={() => setIsVideoCallActive(false)}
          isCaller={true}
          currentUserId={currentUserId}
          targetUserId={patientId}
          targetName={patientName}
        />
      )}
    </div>
  )
}
