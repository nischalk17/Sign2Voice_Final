"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000/api/admin-panel";

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("adminToken");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Users
        const usersRes = await axios.get(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(usersRes.data);

        // Sentences
        const sentencesRes = await axios.get(`${API_BASE}/user-sentences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSentences(sentencesRes.data);
      } catch (err) {
        console.error("Fetch error:", err.response || err);
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

  if (!token) return <p className="text-center mt-10">Please log in as admin</p>;
  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-900 text-white px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-center">Admin Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* Users Table */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Registered Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-4 py-2">Email</th>
                <th className="border border-gray-700 px-4 py-2">Username</th>
                <th className="border border-gray-700 px-4 py-2">Registered At</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="text-center">
                  <td className="border border-gray-700 px-4 py-2">{u.email}</td>
                  <td className="border border-gray-700 px-4 py-2">{u.username}</td>
                  <td className="border border-gray-700 px-4 py-2">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sentences Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">User Sentences History</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-gray-700">
            <thead>
              <tr className="bg-gray-800">
                <th className="border border-gray-700 px-4 py-2">User</th>
                <th className="border border-gray-700 px-4 py-2">Sentence</th>
                <th className="border border-gray-700 px-4 py-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {sentences.map(s => (
                <tr key={s._id} className="text-center">
                  <td className="border border-gray-700 px-4 py-2">{s.user.email || s.user.username}</td>
                  <td className="border border-gray-700 px-4 py-2">{s.text}</td>
                  <td className="border border-gray-700 px-4 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
