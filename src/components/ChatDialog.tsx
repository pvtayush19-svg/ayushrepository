import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Video } from 'lucide-react'
import Chat from './Chat'
import VideoCallDialog from './VideoCallDialog'
export default function ChatDialog({ isOpen, onClose, currentUserId, doctorId, doctorName }: { isOpen: boolean, onClose: () => void, currentUserId: string, doctorId: string, doctorName: string }) {
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
