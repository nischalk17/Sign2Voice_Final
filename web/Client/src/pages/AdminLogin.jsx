"use client";

import { useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Hand, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000/api/admin"; // Admin routes

export default function AdminLogin() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE}/login`, formData);

      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem("admin", JSON.stringify(response.data.admin));

      navigate("/admin-panel");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Hand className="size-5" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">Sign2Voice</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(31,36,33,0.04),0_8px_30px_rgba(31,36,33,0.06)]">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">For administrators only.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <Input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11 bg-white"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Password</span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-11 bg-white pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full text-base">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <button onClick={() => navigate("/")} className="mx-auto mt-5 block text-sm text-muted-foreground hover:text-foreground">
          Back to the app
        </button>
      </div>
    </div>
  );
}
