"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Hand, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = "http://localhost:5000/api/admin-panel";

function formatWhen(value) {
  return value ? new Date(value).toLocaleString() : "";
}

function Table({ columns, rows, empty }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/60 text-muted-foreground">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length ? (
            rows.map((cells, i) => (
              <tr key={i}>
                {cells.map((cell, j) => (
                  <td key={j} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("adminToken");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const usersRes = await axios.get(`${API_BASE}/users`, { headers });
        setUsers(usersRes.data);

        const sentencesRes = await axios.get(`${API_BASE}/user-sentences`, { headers });
        setSentences(sentencesRes.data);
      } catch (err) {
        console.error("Fetch error:", err.response || err);
        setError("Could not load admin data. Your session may have expired; sign in again.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    navigate("/"); // redirect to AuthPage.jsx
  };

  if (!token) return <p className="mt-10 text-center">Please sign in as admin.</p>;
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Loading...
        </span>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Hand className="size-5" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight">Sign2Voice</span>
            <span className="ml-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Admin</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut /> Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {error && <div role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-destructive">{error}</div>}

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Registered users</h2>
            <span className="text-sm text-muted-foreground">{users.length} total</span>
          </div>
          <Table
            columns={["Email", "Username", "Registered"]}
            rows={users.map((u) => [u.email, u.username, formatWhen(u.createdAt)])}
            empty="No users yet."
          />
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Sentence history</h2>
            <span className="text-sm text-muted-foreground">{sentences.length} total</span>
          </div>
          <Table
            columns={["User", "Sentence", "Created"]}
            rows={sentences.map((s) => [s.user?.email || s.user?.username || "(deleted user)", s.text, formatWhen(s.createdAt)])}
            empty="No sentences yet."
          />
        </section>
      </main>
    </div>
  );
}
