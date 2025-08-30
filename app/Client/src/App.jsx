"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import AuthPage from "./pages/AuthPage"
import Dashboard from "./pages/Dashboard"

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-indigo-100/20 to-purple-100/20 animate-pulse"></div>

        {/* Floating background elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-200/30 rounded-full blur-xl animate-bounce delay-100"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-indigo-200/30 rounded-full blur-xl animate-bounce delay-300"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-purple-200/30 rounded-full blur-xl animate-bounce delay-500"></div>

        <div className="text-center z-10 relative">
          <div className="relative mb-8">
            {/* Outer ring */}
            <div className="w-20 h-20 border-4 border-blue-100 rounded-full animate-spin mx-auto absolute"></div>
            {/* Middle ring */}
            <div className="w-20 h-20 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin mx-auto absolute animation-delay-150"></div>
            {/* Inner ring */}
            <div className="w-20 h-20 border-2 border-transparent border-t-indigo-400 rounded-full animate-spin mx-auto animation-delay-300"></div>

            {/* Center pulse */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-700 animate-pulse">Sign2Voice</h2>
            <div className="flex items-center justify-center space-x-1">
              <p className="text-slate-600 font-medium">Connecting to AI model</p>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
            <div className="w-48 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage setIsAuthenticated={setIsAuthenticated} />
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage setIsAuthenticated={setIsAuthenticated} />
            }
          />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />}
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
