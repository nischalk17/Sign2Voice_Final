"use client"

import { useState } from "react"
import axios from "axios"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Github, Mail, Hand, Zap, Users, Eye, EyeOff } from "lucide-react"

const API_BASE = "http://localhost:5000/api"

export default function AuthPage({ setIsAuthenticated }) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError("")
    setSuccess("")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: formData.email,
        password: formData.password,
      })

      localStorage.setItem("token", response.data.token)
      localStorage.setItem("user", JSON.stringify(response.data.user))
      setSuccess("Login successful!")
      setTimeout(() => setIsAuthenticated(true), 1000)
    } catch (err) {
      setError(err.response?.data?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })

      localStorage.setItem("token", response.data.token)
      localStorage.setItem("user", JSON.stringify(response.data.user))
      setSuccess("Account created successfully!")
      setTimeout(() => setIsAuthenticated(true), 1000)
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError("")
    setSuccess("")
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hand className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900">Sign2Voice</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors">
                About
              </a>
              <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2 flex flex-col justify-center px-6 py-16 lg:px-16 bg-white  mt-[-40px]]"
        >
          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Zap className="w-4 h-4" />
              AI-Powered Recognition
            </motion.div>

            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 text-balance leading-tight">
              Bridge the gap with <span className="text-blue-600">Sign2Voice</span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 leading-relaxed text-pretty">
              Convert hand gestures into text and speech instantly. Our AI-powered system recognizes ASL gestures in
              real-time, creating seamless communication.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-slate-700">Real-time gesture recognition</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-slate-700">Instant text-to-speech conversion</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-slate-700">Accessible communication tools</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Trusted by 10,000+ users</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-slate-50"
        >
          <Card className="w-full max-w-md bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white text-center py-8">
              <CardTitle className="text-2xl font-bold">{isLogin ? "Welcome Back" : "Get Started Today"}</CardTitle>
              <p className="text-slate-300 mt-2">
                {isLogin ? "Sign in to your account" : "Join thousands of users worldwide"}
              </p>
            </CardHeader>

            <CardContent className="p-8">
              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                    <Input
                      type="text"
                      name="username"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      required={!isLogin}
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                    <Input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required={!isLogin}
                      className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {loading
                    ? isLogin
                      ? "Signing in..."
                      : "Creating account..."
                    : isLogin
                      ? "Sign In"
                      : "Create Account"}
                </Button>
              </form>

              <div className="text-center mt-6">
                <button onClick={toggleMode} className="text-blue-600 hover:text-blue-700 font-medium">
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-slate-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 border-slate-200 hover:bg-slate-50 bg-transparent">
                  <Mail className="w-5 h-5 mr-2" />
                  Google
                </Button>
                <Button variant="outline" className="h-12 border-slate-200 hover:bg-slate-50 bg-transparent">
                  <Github className="w-5 h-5 mr-2" />
                  GitHub
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-lg text-center text-sm font-medium bg-red-50 text-red-700 border border-red-200"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-lg text-center text-sm font-medium bg-green-50 text-green-700 border border-green-200"
                >
                  {success}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
