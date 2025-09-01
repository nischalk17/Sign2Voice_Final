"use client"

import { useState, useRef } from "react"
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

  // Refs for sections
  const featuresRef = useRef(null)
  const aboutRef = useRef(null)
  const contactRef = useRef(null)

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

  // Smooth scroll handler
  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Gradient border component
  const GradientBorder = () => (
    <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 my-0"></div>
  )

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hand className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">Sign2Voice</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection(featuresRef)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection(aboutRef)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection(contactRef)}
              className="text-gray-300 hover:text-white transition-colors"
            >
              Contact
            </button>
          </nav>
        </div>
      </header>

      {/* Hero + Auth Section */}
      <div className="pt-24 flex flex-col lg:flex-row">
        {/* Left Section */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:w-1/2 flex flex-col justify-center px-6 py-16 lg:px-16 bg-gray-800"
        >
          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-blue-900/50 text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Zap className="w-4 h-4" />
              AI-Powered Recognition
            </motion.div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 text-balance leading-tight">
              Bridge the gap with <span className="text-blue-400">Sign2Voice</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 leading-relaxed text-pretty">
              Convert hand gestures into text and speech instantly. Our AI-powered system recognizes ASL gestures in
              real-time, creating seamless communication.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">Real-time gesture recognition</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">Instant text-to-speech conversion</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">Accessible communication tools</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Trusted by 10,000+ users</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Section - Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-gray-900"
        >
          <Card className="w-full max-w-md bg-gray-800 shadow-xl border border-gray-700 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gray-700 text-white text-center py-8">
              <CardTitle className="text-2xl font-bold">{isLogin ? "Welcome Back" : "Get Started Today"}</CardTitle>
              <p className="text-gray-300 mt-2">
                {isLogin ? "Sign in to your account" : "Join thousands of users worldwide"}
              </p>
            </CardHeader>

            <CardContent className="p-8">
              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <Input
                      type="text"
                      name="username"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleChange}
                      required={!isLogin}
                      className="h-12 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-12 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                    <Input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required={!isLogin}
                      className="h-12 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400"
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
                <button onClick={toggleMode} className="text-blue-400 hover:text-blue-300 font-medium">
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-800 px-4 text-gray-400">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 border-gray-600 hover:bg-gray-700 bg-gray-800 text-gray-300">
                  <Mail className="w-5 h-5 mr-2" />
                  Google
                </Button>
                <Button variant="outline" className="h-12 border-gray-600 hover:bg-gray-700 bg-gray-800 text-gray-300">
                  <Github className="w-5 h-5 mr-2" />
                  GitHub
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-lg text-center text-sm font-medium bg-red-900/50 text-red-300 border border-red-800"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-lg text-center text-sm font-medium bg-green-900/50 text-green-300 border border-green-800"
                >
                  {success}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gradient Borders and Sections */}
      <GradientBorder />

      {/* Features Section */}
      <section ref={featuresRef} className="bg-gray-800 py-20 px-6 text-white">
        <h2 className="text-4xl font-bold mb-6 text-center">Features</h2>
        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2">
          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-blue-400">Real-time Gesture Recognition</h3>
            <p className="text-gray-300">
              Uses your webcam to capture American Sign Language (ASL) hand gestures and instantly translates them into text.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-blue-400">Voice Output</h3>
            <p className="text-gray-300">
              Converts the recognized signs into clear spoken words using a built-in text-to-speech engine.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-blue-400">Smart Word Suggestions</h3>
            <p className="text-gray-300">
              Suggests the next possible words as you sign, making communication faster and more natural.
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-blue-400">User Accounts & History</h3>
            <p className="text-gray-300">
              Sign up to save your signing history, edit past sessions, and personalize your experience.
            </p>
          </div>
        </div>
      </section>

      <GradientBorder />

      {/* About Section */}
      <section ref={aboutRef} className="bg-gray-900 py-20 px-6 text-white">
        <h2 className="text-4xl font-bold mb-12 text-center">About Us</h2>
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-12">
          <div className="lg:w-1/2 space-y-5">
            <p className="text-gray-300 leading-relaxed">
              <span className="font-semibold text-blue-400">Sign2Voice</span> is built with a clear goal:
              to bridge the communication gap between the Deaf community and the hearing world.
              Our system translates American Sign Language (ASL) gestures into spoken words
              and text instantly.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Using a webcam, our system detects your hand movements with <span className="font-semibold">AI-powered vision</span>,
              processes them through a trained deep learning model, and produces real-time transcription.
              This ensures smooth, natural communication.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Beyond simple translation, we provide <span className="font-semibold">smart word suggestions</span>,
              <span className="font-semibold">text-to-speech output</span>, and <span className="font-semibold">user history</span>,
              making the experience personalized and accessible.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Our mission is to make learning and using sign language more approachable for everyone.
              Whether you are Deaf, hard of hearing, or simply learning ASL, Sign2Voice helps you
              connect seamlessly.
            </p>
          </div>

          <div className="lg:w-1/2 flex flex-col items-center">
            <p className="text-lg text-blue-300 font-semibold mb-4 text-center">
              📚 Learn basic ASL and complete daily goals 🚀
            </p>
            <img
              src="/asl sign lang.jpg"
              alt="Learn ASL Sign Language"
              className="rounded-2xl shadow-2xl w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        </div>
      </section>

      <GradientBorder />

      {/* Contact Section */}
      <section ref={contactRef} className="bg-gray-800 py-10 px-6 text-white">
        <h2 className="text-4xl font-bold mb-10 text-center">Contact Us</h2>
        <div className="max-w-4xl mx-auto space-y-4 text-center">
          <p className="text-gray-300 text-lg">
            Reach us at{" "}
            <a
              href="mailto:support@sign2voice.com"
              className="text-blue-400 hover:underline"
            >
              support@sign2voice.com
            </a>
          </p>
          <p className="text-gray-300 text-lg">📞 +977-9863225429</p>
          <p className="text-gray-300 text-lg">📍 Kathmandu, Nepal</p>
          <p className="text-gray-400 text-sm mt-4">
            &copy; {new Date().getFullYear()} Nischal Dhoj Kunwar. All Rights Reserved.
          </p>
        </div>
      </section>
    </div>
  )
}
