import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, Image as ImageIcon, Mic, Square, Paperclip, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Chat({ conversationId, currentUserId }: { conversationId: string, currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    fetchMessages()
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat_${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        setMessages(current => [...current, payload.new])
        // Mark as read if not sent by current user
        if (payload.new.sender_id !== currentUserId) {
           supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (data) {
      setMessages(data)
      // Mark unread messages as read
      const unreadIds = data.filter(m => !m.is_read && m.sender_id !== currentUserId).map(m => m.id)
      if (unreadIds.length > 0) {
        supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then()
      }
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() && !isUploading) return

    const msg = newMessage
    setNewMessage('')
    await supabase.from('messages').insert([{
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: msg
    }])
  }

  const uploadMedia = async (file: Blob | File, type: 'image' | 'audio') => {
    setIsUploading(true)
    try {
      const fileExt = type === 'image' ? (file as File).name.split('.').pop() : 'webm'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${conversationId}/${fileName}`

      const { error: uploadError } = await supabase.storage.from('Image').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('Image').getPublicUrl(filePath)

      await supabase.from('messages').insert([{
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: type === 'image' ? 'Sent an image' : 'Sent a voice message',
        media_url: publicUrl,
        media_type: type
      }])
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMedia(e.target.files[0], 'image')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        uploadMedia(audioBlob, 'audio')
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      toast.error('Microphone permission denied or not available.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-none overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isMe ? 'bg-primary dark:bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'}`}>
                {msg.media_type === 'image' && msg.media_url && (
                   <img src={msg.media_url} alt="Shared" className="rounded-md max-w-full mb-2 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.media_url, '_blank')} />
                )}
                {msg.media_type === 'audio' && msg.media_url && (
                   <audio src={msg.media_url} controls className={`w-full max-w-[200px] mb-2 ${isMe ? 'invert sepia saturate-0 hue-rotate-180' : ''}`} />
                )}
                {(!msg.media_type || msg.content) && <p>{msg.content}</p>}
                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-100' : 'text-slate-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-3 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex items-center gap-2">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
        />
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()} 
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Attach Image"
          disabled={isUploading || isRecording}
        >
          <ImageIcon size={20} />
        </button>

        {isRecording ? (
          <div className="flex-1 px-3 py-2 border dark:border-red-900/50 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 animate-pulse"></span>
            Recording audio...
          </div>
        ) : (
          <input 
            type="text" 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
            className="flex-1 px-3 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full focus:outline-none focus:border-primary dark:focus:border-indigo-500 focus:ring-1 focus:ring-primary dark:focus:ring-indigo-500"
            placeholder="Type a message..."
            disabled={isUploading}
          />
        )}

        {isRecording ? (
          <button type="button" onClick={stopRecording} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 animate-pulse">
            <Square size={20} fill="currentColor" />
          </button>
        ) : newMessage.trim() ? (
          <button type="submit" disabled={isUploading} className="bg-primary dark:bg-indigo-600 text-white p-2 rounded-full hover:bg-primary/90 dark:hover:bg-indigo-500 disabled:opacity-50">
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={isUploading} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50" title="Hold or click to record voice">
            {isUploading ? <Loader2 size={20} className="animate-spin text-primary dark:text-indigo-400" /> : <Mic size={20} />}
          </button>
        )}
      </form>
    </div>
  )
}
