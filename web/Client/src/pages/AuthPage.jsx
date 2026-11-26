"use client"

import { useState } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Camera, Volume2, History, Eye, EyeOff, Hand, AlertCircle, CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

const API_BASE = "http://localhost:5000/api"
const REPO_URL = "https://github.com/nischalk17/Sign2Voice_Final"

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Hand className="size-5" strokeWidth={2} />
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight">Sign2Voice</span>
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint}
    </label>
  )
}

function PasswordInput({ show, onToggle, ...props }) {
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className="h-11 bg-white pr-11" {...props} />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export default function AuthPage({ setIsAuthenticated }) {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
      setSuccess("Signed in.")
      setTimeout(() => setIsAuthenticated(true), 600)
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
      setSuccess("Account created.")
      setTimeout(() => setIsAuthenticated(true), 600)
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (login) => {
    if (login === isLogin) return
    setIsLogin(login)
    setError("")
    setSuccess("")
    setFormData({ username: "", email: "", password: "", confirmPassword: "" })
  }

  const mismatch = !isLogin && formData.confirmPassword && formData.password !== formData.confirmPassword

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <a href="#how" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
              How it works
            </a>
            <a href="#limits" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
              Accuracy
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
            >
              Source code
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:py-20">
          <div className="flex flex-col lg:pt-10">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">ASL fingerspelling to text and speech</p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
              Spell with your hands. Hear it spoken.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Sign2Voice reads fingerspelled letters from your webcam, builds the sentence, suggests the next word and
              reads it aloud. It is a student research project, built to be measured honestly.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                [Camera, "Works from a normal webcam", "Hand landmarks are found on your computer; images are not uploaded."],
                [Volume2, "Speaks what you spell", "Text-to-speech turns the sentence into audio."],
                [History, "Keeps your sentences", "Save, review and delete your history from your account."],
              ].map(([Icon, title, text]) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
                    <Icon className="size-[18px]" />
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(31,36,33,0.04),0_8px_30px_rgba(31,36,33,0.06)]">
              <div role="tablist" aria-label="Sign in or create an account" className="mb-6 grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm font-medium">
                {[
                  [true, "Sign in"],
                  [false, "Create account"],
                ].map(([value, label]) => (
                  <button
                    key={label}
                    role="tab"
                    aria-selected={isLogin === value}
                    onClick={() => switchMode(value)}
                    className={`rounded-md py-2 transition-colors ${
                      isLogin === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <h2 className="font-serif text-2xl font-semibold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h2>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">
                {isLogin ? "Sign in to open Sign2Voice and see your saved sentences." : "It takes under a minute."}
              </p>

              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
                {!isLogin && (
                  <Field label="Username">
                    <Input
                      type="text"
                      name="username"
                      autoComplete="username"
                      placeholder="At least 3 characters"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      className="h-11 bg-white"
                    />
                  </Field>
                )}

                <Field label="Email">
                  <Input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-11 bg-white"
                  />
                </Field>

                <Field
                  label="Password"
                  hint={
                    !isLogin && (
                      <span className="mt-1.5 block text-xs text-muted-foreground">
                        8+ characters with a letter, a number and a symbol.
                      </span>
                    )
                  }
                >
                  <PasswordInput
                    name="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="Your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </Field>

                {!isLogin && (
                  <Field
                    label="Confirm password"
                    hint={mismatch && <span className="mt-1.5 block text-sm text-destructive">Passwords do not match</span>}
                  >
                    <PasswordInput
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      show={showConfirm}
                      onToggle={() => setShowConfirm(!showConfirm)}
                    />
                  </Field>
                )}

                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div role="status" className="flex items-start gap-2 rounded-lg bg-ok-soft px-3 py-2.5 text-sm text-ok">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="h-11 w-full text-base">
                  {loading ? (isLogin ? "Signing in..." : "Creating account...") : isLogin ? "Sign in" : "Create account"}
                </Button>
              </form>
            </div>
          </div>
        </section>

        <section id="how" className="border-y border-border bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {[
                ["1", "Show a letter", "Hold a fingerspelled ASL letter in front of your webcam. MediaPipe finds 21 points on your hand."],
                ["2", "A small network reads it", "A compact 1D convolutional neural network, trained from scratch for this project, turns the 21 points into a letter."],
                ["3", "Text, suggestions, speech", "Letters build a sentence. A pretrained language model suggests the next word, and the sentence can be spoken or saved."],
              ].map(([n, title, text]) => (
                <li key={n}>
                  <span className="font-serif text-3xl text-primary">{n}</span>
                  <h3 className="mt-2 text-lg font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="limits" className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-serif text-3xl font-semibold tracking-tight">How accurate is it?</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            It depends heavily on who is signing and on the camera. These are measured numbers for the model used in this
            app, not marketing claims.
          </p>
          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["96%", "Held-out frames from the training dataset", "Same signers and setup as training."],
              ["78%", "Five different signers", "A second public dataset the model never saw."],
              ["49-51%", "A real webcam", "Recorded by one person in two lighting setups."],
            ].map(([value, label, note]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-5">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-serif text-4xl font-semibold text-primary">{value}</dd>
                <p className="mt-2 text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            Sign2Voice recognises single fingerspelled letters, not full American Sign Language, and it is weaker on letters
            that need motion (J, Z). Full results and the robustness study are in the{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              project repository
            </a>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Sign2Voice. MIT licensed.</span>
          <span className="flex items-center gap-4">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Source code
            </a>
            <button onClick={() => navigate("/admin-login")} className="hover:text-foreground">
              Admin
            </button>
          </span>
        </div>
      </footer>
    </div>
  )
}
