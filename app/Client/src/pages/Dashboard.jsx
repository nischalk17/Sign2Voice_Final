"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

export default function Dashboard({ setIsAuthenticated }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [loadingStep, setLoadingStep] = useState(0)
  const [sentences, setSentences] = useState([])
  const [stats, setStats] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const navigate = useNavigate()

  const loadingSteps = [
    "Initializing Sign2Voice...",
    "Loading TensorFlow model...",
    "Setting up MediaPipe hands detection...",
    "Preparing camera interface...",
    "Almost ready...",
  ]

  // Fetch user profile
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return navigate("/")

    axios
      .get("http://localhost:5000/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setIsAuthenticated(false)
        navigate("/")
      })
  }, [navigate, setIsAuthenticated])

  // Loading animation
  useEffect(() => {
    let interval
    if (loading) {
      setLoadingStep(0)
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev))
      }, 1500)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [loading])

  // Open webcam
  const handleOpenWebcam = async () => {
    try {
      setLoading(true)
      setMessage("")

      const res = await axios.post("http://localhost:5000/api/open-webcam")
      setMessage(res.data.message || "✅ Sign2Voice is ready!")

      if (res.data.sessionId) {
        localStorage.setItem("currentSessionId", res.data.sessionId)
      }
    } catch (err) {
      console.error(err)
      // setMessage("❌ Failed to open webcam app")
    } finally {
      setLoading(false)
    }
  }

  // Fetch /stats and set sentences
  const fetchStats = async () => {
    try {
      setHistoryLoading(true)
      const token = localStorage.getItem("token")
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const res = await axios.get("http://localhost:5000/api/sentences/stats", { headers })
      console.log("Stats fetched from /stats:", res.data.stats)

      const allStats = res.data.stats || []
      setSentences(allStats)

      const totalSentences = allStats.length
      const totalWords = allStats.reduce((sum, s) => sum + (s.wordCount || 0), 0)
      const avgWordsPerSentence = totalSentences ? totalWords / totalSentences : 0

      setStats({ totalSentences, totalWords, avgWordsPerSentence })
    } catch (err) {
      console.error("Error fetching stats:", err)
      setMessage("❌ Failed to load stats")
    } finally {
      setHistoryLoading(false)
    }
  }

  // Delete sentence
  const deleteSentence = async (sentenceId) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setMessage("❌ Only logged-in users can delete sentences")
        return
      }
      console.log("Deleting sentence with ID:", sentenceId)

      await axios.delete(`http://localhost:5000/api/sentences/${sentenceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setSentences(sentences.filter((s) => s._id !== sentenceId))
      setMessage("✅ Sentence deleted successfully")
    } catch (err) {
      console.error("Error deleting sentence:", err)
      setMessage("❌ Failed to delete sentence")
    }
  }

  const toggleHistory = () => {
    if (!showHistory) fetchStats()
    setShowHistory(!showHistory)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("currentSessionId")
    setIsAuthenticated(false)
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 flex justify-between w-full max-w-4xl mb-6">
        <h1 className="text-xl font-bold text-indigo-600">
          {user ? `Welcome, ${user.username} 🎉` : "Dashboard"}
        </h1>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
          Logout
        </button>
      </nav>

      {/* Buttons */}
      <div className="flex gap-4 justify-center mb-6 w-full max-w-4xl">
        <button
          onClick={handleOpenWebcam}
          disabled={loading}
          className="px-6 py-3 rounded-2xl shadow-md text-lg font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Launching..." : "🎥 Open Sign2Voice"}
        </button>
        <button
          onClick={toggleHistory}
          className="px-6 py-3 rounded-2xl shadow-md text-lg font-semibold text-white bg-green-500 hover:bg-green-600"
        >
          {showHistory ? "📱 Hide History" : "📚 View History"}
        </button>
      </div>

      {message && <p className="text-center mb-4 text-gray-700 font-medium">{message}</p>}

      {/* History / Stats */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📚 Sentence History</h2>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-blue-600">Total Sentences</h3>
                <p className="text-2xl font-bold text-blue-800">{stats.totalSentences}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-green-600">Total Words</h3>
                <p className="text-2xl font-bold text-green-800">{stats.totalWords}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-purple-600">Avg Words/Sentence</h3>
                <p className="text-2xl font-bold text-purple-800">{Math.round(stats.avgWordsPerSentence)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold text-orange-600">Sessions</h3>
                <p className="text-2xl font-bold text-orange-800">{new Set(sentences.map((s) => s.sessionId)).size}</p>
              </div>
            </div>
          )}

          {/* Sentences */}
          {historyLoading ? (
            <p className="text-center">Loading sentences...</p>
          ) : sentences.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sentences.map((s) => (
                <div key={s._id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500 flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">{s.text}</p>
                    <p className="text-sm text-gray-600">Session: {s.sessionId}</p>
                    <p className="text-sm text-gray-500">Words: {s.wordCount}</p>
                  </div>
                  <button
                    onClick={() => deleteSentence(s._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No sentences recorded yet.</p>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Sign2Voice</h3>
            <p className="text-blue-600 font-semibold mb-4">{loadingSteps[loadingStep]}</p>
          </div>
        </div>
      )}
    </div>
  )
}
