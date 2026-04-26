"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase";
import toast from "react-hot-toast";
import { Loader2, UserPlus } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is disabled in Supabase, session is set immediately
    if (data.session) {
      window.location.href = "/dashboard";
    } else {
      // Email confirmation required
      setDone(true);
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="card-neo p-8 text-center">
        <div className="text-4xl mb-3">📬</div>
        <h2 className="font-display text-xl font-bold text-ink-900 mb-2">Check your email</h2>
        <p className="text-sm text-ink-500 mb-4">
          We sent a confirmation link to <strong>{email}</strong>.<br />
          Click it to activate your account, then sign in.
        </p>
        <Link href="/auth/sign-in" className="btn-neo-amber w-full justify-center py-2.5 inline-flex">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="card-neo p-8">
      <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Create account</h1>
      <p className="text-sm text-ink-500 mb-6">Start generating JEE mock tests</p>

      <form onSubmit={handleSignUp} className="space-y-4">
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min. 6 characters"
            className="input-neo"
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-neo-amber w-full justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {loading ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="text-sm text-ink-500 mt-5 text-center">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-ink-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
