import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { ErrorBoundary } from "@/components/ErrorBoundary"

import Login from "@/pages/Login"
import AdminLogin from "@/pages/AdminLogin"
import Register from "@/pages/Register"

import AdminDashboard from "@/pages/AdminDashboard"
import PatientDashboard from "@/pages/PatientDashboard"
import DoctorDashboard from "@/pages/DoctorDashboard"
import AmbulanceDashboard from "@/pages/AmbulanceDashboard"
import LandingPage from "@/pages/LandingPage"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/" element={<LandingPage />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Patient Routes */}
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor/dashboard" element={<ErrorBoundary><DoctorDashboard /></ErrorBoundary>} />
          </Route>

          {/* Ambulance Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ambulance']} />}>
            <Route path="/ambulance/dashboard" element={<AmbulanceDashboard />} />
          </Route>

        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  )
}
