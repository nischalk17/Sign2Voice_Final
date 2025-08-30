"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const API_URL = "http://localhost:5000/api/auth";

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      setMessage("All fields are required!");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/register`, { username, email, password });
      setMessage(`Registered successfully! Welcome ${res.data.user.username}`);
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsLogin(true);
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed");
    }
  };

const handleLogin = async () => {
  if (!email || !password) {
    setMessage("All fields are required!");
    return;
  }
  try {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    setMessage(`Login successful! Welcome ${res.data.user.username}`);
    setEmail("");
    setPassword("");
    localStorage.setItem("token", res.data.token);

    // Redirect to dashboard
    window.location.href = "/dashboard";
  } catch (err) {
    setMessage(err.response?.data?.message || "Login failed");
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-600 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">{isLogin ? "Login" : "Register"}</h2>

        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </>
        )}

        {isLogin && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mb-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </>
        )}

        <button
          onClick={isLogin ? handleLogin : handleRegister}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-lg font-semibold transition duration-200"
        >
          {isLogin ? "Login" : "Register"}
        </button>

        <p className="text-center mt-4 text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            className="text-indigo-500 font-semibold cursor-pointer hover:underline"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
              setUsername("");
              setEmail("");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            {isLogin ? "Register" : "Login"}
          </span>
        </p>

        {message && <p className="mt-4 text-center text-green-600 font-medium">{message}</p>}
      </div>
    </div>
  );
}
