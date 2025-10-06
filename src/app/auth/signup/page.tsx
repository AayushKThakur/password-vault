"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      setMsg("Signup successful! Please login.");
      setEmail("");
      setPassword("");
      setTimeout(() => router.push("/auth/login"), 1000);
    } else {
      setMsg(data.error || "Signup failed");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow space-y-4"
    >
      <h2 className="text-2xl font-bold">Sign Up</h2>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <input
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <button
        type="submit"
        className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Sign Up
      </button>
      <p className="text-sm text-red-600">{msg}</p>
      <div>
        <a href="/auth/login" className="text-blue-600 hover:underline">
          Already have an account? Login
        </a>
      </div>
    </form>
  );
}
