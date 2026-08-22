import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { session, role, loading } = useAuth()

  const location = useLocation()

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  
  if (!session) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If not allowed, send them to their respective dashboard
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'patient') return <Navigate to="/patient/dashboard" replace />
    if (role === 'doctor') return <Navigate to="/doctor/dashboard" replace />
    if (role === 'ambulance') return <Navigate to="/ambulance/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
