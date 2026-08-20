import React, { useEffect, useRef, useState } from 'react'
import { X, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type VideoCallDialogProps = {
  isOpen: boolean
  onClose: () => void
  isCaller: boolean
  currentUserId: string
  targetUserId: string
  targetName: string
  onCallEnd?: () => void
}

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export default function VideoCallDialog({ isOpen, onClose, isCaller, currentUserId, targetUserId, targetName, onCallEnd }: VideoCallDialogProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null)
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([])
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting')

  // Generate a consistent room ID regardless of who called who
  const channelName = `video-call-${[currentUserId, targetUserId].sort().join('-')}`
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (isOpen) {
      startCall()
    } else {
      endCall()
    }
    return () => endCall()
  }, [isOpen])

  const startCall = async () => {
    try {
      setCallStatus('connecting')
      
      // Request permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setLocalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      const pc = new RTCPeerConnection(configuration)
      setPeerConnection(pc)

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream))

      // Listen for remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
        setCallStatus('connected')
      }

      // Initialize Supabase Broadcast Channel for signaling
      const channel = supabase.channel(channelName)
      channelRef.current = channel

      // Handle incoming signaling messages
      channel.on('broadcast', { event: 'signaling' }, async (payload) => {
        const { type, data, from } = payload.payload
        if (from === currentUserId) return // Ignore own messages

        if (type === 'ready' && isCaller) {
          // Callee is ready, caller generates offer
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channel.send({ type: 'broadcast', event: 'signaling', payload: { type: 'offer', data: offer, from: currentUserId } })
        }
        else if (type === 'offer' && !isCaller) {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          
          // Process queued ICE candidates
          for (const candidate of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          iceCandidateQueue.current = []

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          channel.send({ type: 'broadcast', event: 'signaling', payload: { type: 'answer', data: answer, from: currentUserId } })
        } 
        else if (type === 'answer' && isCaller) {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          
          // Process queued ICE candidates
          for (const candidate of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          iceCandidateQueue.current = []

          setCallStatus('connected')
        } 
        else if (type === 'ice-candidate') {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data))
          } else {
            iceCandidateQueue.current.push(data)
          }
        }
        else if (type === 'end-call') {
          handleRemoteHangup()
        }
      })

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({ type: 'broadcast', event: 'signaling', payload: { type: 'ice-candidate', data: event.candidate, from: currentUserId } })
        }
      }

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (isCaller) {
            setCallStatus('ringing')
            // Notify target user via a separate broadcast that they have an incoming call
            supabase.channel('global-notifications').send({
              type: 'broadcast',
              event: 'incoming-call',
              payload: { callerId: currentUserId, targetId: targetUserId, callerName: 'Patient' } 
            })
            // Caller waits for 'ready' signal from callee to send offer
          } else {
            // Callee is now subscribed and ready, signal the caller
            channel.send({ type: 'broadcast', event: 'signaling', payload: { type: 'ready', from: currentUserId } })
          }
        }
      })

    } catch (error) {
      console.error("Error accessing media devices.", error)
      setCallStatus('ended')
    }
  }

  const endCall = () => {
    setCallStatus('ended')
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }
    if (peerConnection) {
      peerConnection.close()
      setPeerConnection(null)
    }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'signaling', payload: { type: 'end-call', from: currentUserId } })
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (onCallEnd) onCallEnd()
    onClose()
  }

  const handleRemoteHangup = () => {
    setCallStatus('ended')
    if (localStream) localStream.getTracks().forEach(track => track.stop())
    if (peerConnection) peerConnection.close()
    if (onCallEnd) onCallEnd()
    onClose()
  }

  const toggleMute = () => {
    if (localStream) {
      const newMuted = !isMuted
      localStream.getAudioTracks().forEach(track => track.enabled = !newMuted)
      setIsMuted(newMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const newVideoOff = !isVideoOff
      localStream.getVideoTracks().forEach(track => track.enabled = !newVideoOff)
      setIsVideoOff(newVideoOff)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[60] flex flex-col backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="p-6 flex justify-between items-center text-white z-10">
        <div>
          <h2 className="text-2xl font-bold">{targetName}</h2>
          <p className="text-slate-400 flex items-center gap-2">
             {callStatus === 'connecting' && <span className="animate-pulse">Requesting secure connection...</span>}
             {callStatus === 'ringing' && <span className="animate-pulse">Ringing...</span>}
             {callStatus === 'connected' && <span className="text-green-400 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Connected Securely</span>}
             {callStatus === 'ended' && <span className="text-red-400">Call Ended</span>}
          </p>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative p-6 flex items-center justify-center">
        {/* Remote Video (Full Screen) */}
        <div className="absolute inset-0 bg-slate-800 rounded-3xl overflow-hidden m-6 border border-slate-700 shadow-2xl">
           <video 
             ref={remoteVideoRef} 
             autoPlay 
             playsInline 
             className={`w-full h-full object-cover transition-opacity duration-500 ${callStatus === 'connected' ? 'opacity-100' : 'opacity-0'}`}
           />
           {callStatus !== 'connected' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <Video size={64} className="mb-4 opacity-20" />
                <p className="text-xl font-medium">{callStatus === 'ringing' ? 'Waiting for doctor to answer...' : 'Connecting...'}</p>
             </div>
           )}
        </div>

        {/* Local Video (Picture in Picture) */}
        <div className="absolute bottom-12 right-12 w-48 h-64 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-600 shadow-xl shadow-black/50 z-20">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
               <VideoOff size={32} className="text-slate-500" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-8 flex justify-center items-center gap-6 z-10 pb-12">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all hover:scale-110 ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button 
          onClick={endCall}
          className="p-5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all hover:scale-110 shadow-lg shadow-red-600/30">
          <PhoneOff size={32} />
        </button>

        <button 
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all hover:scale-110 ${isVideoOff ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
      </div>

    </div>
  )
}
