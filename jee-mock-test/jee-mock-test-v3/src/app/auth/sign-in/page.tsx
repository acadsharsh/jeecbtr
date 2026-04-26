"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Loader2, LogIn } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      // Hard navigate so middleware picks up the new session cookie
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="card-neo p-8">
      <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Sign in</h1>
      <p className="text-sm text-ink-500 mb-6">Enter your credentials to continue</p>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="section-label block mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-neo"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="section-label block mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input-neo"
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-neo-amber w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="text-sm text-ink-500 mt-5 text-center">
        Don't have an account?{" "}
        <Link href="/auth/sign-up" className="font-medium text-ink-900 underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}
