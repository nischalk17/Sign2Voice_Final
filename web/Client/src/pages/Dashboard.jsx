"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Hand, LogOut, Video, Trash2, Loader2, AlertCircle, CheckCircle2, Target, FileText, Type, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

const API = "http://localhost:5000/api"

function formatWhen(value) {
  if (!value) return ""
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export default function Dashboard({ setIsAuthenticated }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null) // { type: "ok" | "error", text }
  const [sentences, setSentences] = useState([])
  const [stats, setStats] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [todayGoal, setTodayGoal] = useState({ target: 10, completed: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return navigate("/")

    axios
      .get(`${API}/auth/profile`, {
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

  // Daily goal = number of sentences this user saved today (local date). No separate endpoint needed.
  useEffect(() => {
    const isToday = (d) => new Date(d).toDateString() === new Date().toDateString()
    const completed = sentences.filter((s) => s.createdAt && isToday(s.createdAt)).length
    setTodayGoal((prev) => ({ ...prev, completed }))
  }, [sentences])

  const handleOpenWebcam = async () => {
    try {
      setLoading(true)
      setNotice(null)

      const res = await axios.post(
        `${API}/open-webcam`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )
      setNotice({ type: "ok", text: res.data.message || "Sign2Voice is ready." })

      if (res.data.sessionId) {
        localStorage.setItem("currentSessionId", res.data.sessionId)
      }
    } catch (err) {
      console.error(err)
      setNotice({ type: "error", text: err.response?.data?.error || "Could not start Sign2Voice." })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setHistoryLoading(true)
      const token = localStorage.getItem("token")
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const res = await axios.get(`${API}/sentences/stats`, { headers })

      const allStats = res.data.stats || []
      setSentences(allStats)

      const totalSentences = allStats.length
      const totalWords = allStats.reduce((sum, s) => sum + (s.wordCount || 0), 0)
      const avgWordsPerSentence = totalSentences ? totalWords / totalSentences : 0

      setStats({ totalSentences, totalWords, avgWordsPerSentence })
    } catch (err) {
      console.error("Error fetching stats:", err)
      setNotice({ type: "error", text: "Could not load your history." })
    } finally {
      setHistoryLoading(false)
    }
  }

  const deleteSentence = async (sentenceId) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setNotice({ type: "error", text: "Only signed-in users can delete sentences." })
        return
      }

      await axios.delete(`${API}/sentences/${sentenceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const remaining = sentences.filter((s) => s._id !== sentenceId)
      setSentences(remaining)
      const totalWords = remaining.reduce((sum, s) => sum + (s.wordCount || 0), 0)
      setStats({
        totalSentences: remaining.length,
        totalWords,
        avgWordsPerSentence: remaining.length ? totalWords / remaining.length : 0,
      })
      setNotice({ type: "ok", text: "Sentence deleted." })
    } catch (err) {
      console.error("Error deleting sentence:", err)
      setNotice({ type: "error", text: "Could not delete the sentence." })
    }
  }

  // Load the user's sentences once on mount (history, stats and daily goal all come from this).
  useEffect(() => {
    if (localStorage.getItem("token")) fetchStats()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("currentSessionId")
    setIsAuthenticated(false)
    navigate("/")
  }

  const goalPct = Math.min(100, Math.round((todayGoal.completed / todayGoal.target) * 100))
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  const sessionCount = new Set(sentences.map((s) => s.sessionId)).size

  const statCards = [
    [FileText, "Saved sentences", stats ? stats.totalSentences : "-"],
    [Type, "Words", stats ? stats.totalWords : "-"],
    [Type, "Average words per sentence", stats ? Math.round(stats.avgWordsPerSentence * 10) / 10 : "-"],
    [Layers, "Sessions", stats ? sessionCount : "-"],
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Hand className="size-5" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight">Sign2Voice</span>
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="hidden text-sm text-muted-foreground sm:block">{user.username}</span>}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
            {user ? `Welcome back, ${user.username}` : "Welcome back"}
          </h1>
        </div>

        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold">Start signing</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Opens the Sign2Voice desktop app on this computer. You are already signed in there. The first launch can take
              a minute while the models load.
            </p>
          </div>
          <Button size="lg" className="h-12 shrink-0 px-6 text-base" onClick={handleOpenWebcam} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Video />}
            {loading ? "Starting..." : "Open Sign2Voice"}
          </Button>
        </section>

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
              notice.type === "error" ? "bg-danger-soft text-destructive" : "bg-ok-soft text-ok"
            }`}
          >
            {notice.type === "error" ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <section className="grid grid-cols-2 gap-4 md:grid-cols-[1.3fr_repeat(2,1fr)]">
          <div className="col-span-2 rounded-xl border border-border bg-card p-5 md:col-span-1 md:row-span-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="size-4" /> Today's goal
            </div>
            <p className="mt-2 font-serif text-4xl font-semibold">
              {todayGoal.completed}
              <span className="text-2xl text-muted-foreground"> / {todayGoal.target}</span>
            </p>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={goalPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {todayGoal.completed >= todayGoal.target
                ? "Goal reached for today."
                : `${todayGoal.target - todayGoal.completed} more saved sentence${todayGoal.target - todayGoal.completed === 1 ? "" : "s"} to reach today's goal.`}
            </p>
          </div>

          {statCards.map(([Icon, label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4" /> {label}
              </div>
              <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Saved sentences</h2>
            {stats && <span className="text-sm text-muted-foreground">{stats.totalSentences} total</span>}
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-14 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your history...
            </div>
          ) : sentences.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {sentences.map((s) => (
                <li key={s._id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{s.text}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatWhen(s.createdAt)} &middot; {s.wordCount} {s.wordCount === 1 ? "word" : "words"} &middot; session{" "}
                      {String(s.sessionId).slice(0, 8)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSentence(s._id)}
                    aria-label="Delete sentence"
                    className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <p className="font-medium">Nothing saved yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sentences you save from the Sign2Voice app will appear here.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
