"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import AuthPage from "./pages/AuthPage"
import Dashboard from "./pages/Dashboard"
import AdminLogin from "./pages/AdminLogin"
import AdminPanel from "./pages/AdminPanel" // ✅ import AdminPanel

// Reads the admin token at render time of the route (not once when App mounts), so logging in
// and navigating to /admin-panel works without a page reload.
function RequireAdmin({ children }) {
  return localStorage.getItem("adminToken") ? children : <Navigate to="/admin-login" />
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) setIsAuthenticated(true)
    setLoading(false)
  }, [])


  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* User routes */}
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

          {/* Admin routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route
            path="/admin-panel"
            element={
              <RequireAdmin>
                <AdminPanel />
              </RequireAdmin>
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
