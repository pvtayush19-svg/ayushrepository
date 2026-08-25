import React from 'react'
import { Link } from 'react-router-dom'
import { Activity, Shield, Clock, MapPin, PhoneCall, ChevronRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-primary/20 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-black bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-2 tracking-tight">
            <img src="/logo.jpg" alt="MedoCare" className="w-8 h-8 object-contain" /> MedoCare
          </h1>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-600 hover:text-primary font-medium transition-colors px-4 py-2">
              Log in
            </Link>
            <Link to="/register" className="bg-primary text-white hover:bg-primary/90 font-medium px-5 py-2.5 rounded-full shadow-md shadow-primary/20 transition-all hover:scale-105">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm mb-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                The Future of Healthcare Access
              </div>
              <h2 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight mb-8 animate-in slide-in-from-bottom-6 duration-700 fade-in">
                Connecting you to <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">lifesaving care</span> instantly.
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed animate-in slide-in-from-bottom-8 duration-700 fade-in delay-100">
                Whether you need a specialist consultation, a secure video call with your doctor, or an emergency ambulance dispatched to your exact GPS location—MedoCare handles it all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in slide-in-from-bottom-10 duration-700 fade-in delay-200">
                <Link to="/register" className="w-full sm:w-auto bg-primary text-white font-bold text-lg px-8 py-4 rounded-full shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105 flex items-center justify-center gap-2">
                  Get Started for Free <ChevronRight size={20} />
                </Link>
                <Link to="/login" className="w-full sm:w-auto bg-slate-100 text-slate-700 font-bold text-lg px-8 py-4 rounded-full hover:bg-slate-200 transition-all flex items-center justify-center">
                  Provider Login
                </Link>
              </div>
            </div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 opacity-10 pointer-events-none">
             <img src="/logo.jpg" alt="MedoCare" className="w-[600px] h-[600px] object-contain grayscale" />
          </div>
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[800px] h-[800px] bg-gradient-to-tr from-blue-100 to-transparent rounded-full blur-3xl -z-10"></div>
        </div>

        {/* Features Section */}
        <div className="bg-slate-50 py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need in an emergency</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Our platform provides robust tools for patients and providers to ensure seamless medical communication and dispatching.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary/20 transition-all group">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <PhoneCall size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Video Consultations</h3>
                <p className="text-slate-600">Connect with specialized doctors globally using our highly secure, encrypted Peer-to-Peer WebRTC video calling system.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-red-500/20 transition-all group">
                <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MapPin size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Live GPS Ambulance Dispatch</h3>
                <p className="text-slate-600">Request an emergency ambulance directly to your live GPS coordinates, and track their approach on a real-time global map.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-green-500/20 transition-all group">
                <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Medical Providers</h3>
                <p className="text-slate-600">Every doctor and ambulance provider on MedoCare undergoes strict admin verification, ensuring you are always in safe hands.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
           <img src="/logo.jpg" alt="MedoCare" className="w-12 h-12 object-contain mb-4 opacity-80" />
           <p className="mb-2">© 2026 MedoCare Portal. All rights reserved.</p>
           <p className="text-sm">Built for robust, real-time healthcare access.</p>
        </div>
      </footer>
    </div>
  )
}
