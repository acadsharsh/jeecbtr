import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { formatDate, getScoreColor } from "@/lib/utils";
import { Plus, BookOpen, Target, TrendingUp, Clock } from "lucide-react";
import type { Test, Attempt } from "@/types";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = createServiceClient();

  const [{ data: tests }, { data: attempts }] = await Promise.all([
    supabase.from("tests").select("*").eq("clerk_user_id", user.id)
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("attempts").select("*, tests(title, subject)")
      .eq("clerk_user_id", user.id).eq("status", "submitted")
      .order("submitted_at", { ascending: false }).limit(5),
  ]);

  const allAttempts = attempts as (Attempt & { tests: Test })[] | null;
  const avgScore = allAttempts?.length
    ? allAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / allAttempts.length
    : 0;

  const stats = [
    { label: "Tests Created", value: tests?.length ?? 0, icon: BookOpen, color: "text-amber-500" },
    { label: "Tests Attempted", value: allAttempts?.length ?? 0, icon: Target, color: "text-emerald-500" },
    { label: "Avg Score", value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: "text-ink-900" },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="section-label mb-1">Overview</p>
          <h1 className="font-display text-4xl font-bold text-ink-900">Dashboard</h1>
          <p className="text-xs font-mono text-ink-400 mt-1">{user.email}</p>
        </div>
        <Link href="/tests/new" className="btn-neo-amber"><Plus size={16} />New Test</Link>
      </div>

      <div className="grid grid-cols-3 gap-0 border-2 border-ink-900 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`px-8 py-6 bg-white ${i < 2 ? "border-r-2 border-ink-900" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={s.color} />
                <span className="section-label">{s.label}</span>
              </div>
              <div className="font-display text-4xl font-bold text-ink-900">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-neo p-0 overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-ink-900 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent Tests</h2>
            <Link href="/dashboard/tests" className="text-xs font-mono text-ink-500 hover:text-ink-900 transition-colors">View all →</Link>
          </div>
          {tests?.length ? (
            <div>
              {(tests as Test[]).map((test, i) => (
                <div key={test.id} className={`px-6 py-4 flex items-center justify-between hover:bg-ink-50 transition-colors ${i < tests.length - 1 ? "border-b border-ink-100" : ""}`}>
                  <div className="min-w-0">
                    <p className="font-body font-medium text-sm text-ink-900 truncate">{test.title}</p>
                    <p className="text-xs text-ink-400 font-mono mt-0.5">{test.subject} · {formatDate(test.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className={`badge ${test.is_public ? "text-emerald-600 border-emerald-600" : "text-ink-400 border-ink-300"}`}>
                      {test.is_public ? "Public" : "Private"}
                    </span>
                    <Link href={`/tests/${test.slug}`} className="btn-neo-outline text-xs px-3 py-1">View</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-ink-400 text-sm mb-4">No tests yet</p>
              <Link href="/tests/new" className="btn-neo text-xs">Create your first test</Link>
            </div>
          )}
        </div>

        <div className="card-neo p-0 overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-ink-900">
            <h2 className="font-display text-lg font-bold">Recent Attempts</h2>
          </div>
          {allAttempts?.length ? (
            <div>
              {allAttempts.map((attempt, i) => (
                <div key={attempt.id} className={`px-6 py-4 flex items-center justify-between hover:bg-ink-50 transition-colors ${i < allAttempts.length - 1 ? "border-b border-ink-100" : ""}`}>
                  <div className="min-w-0">
                    <p className="font-body font-medium text-sm text-ink-900 truncate">{attempt.tests?.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={10} className="text-ink-400" />
                      <span className="text-xs text-ink-400 font-mono">{attempt.submitted_at ? formatDate(attempt.submitted_at) : "—"}</span>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <span className={`font-display text-xl font-bold ${getScoreColor(attempt.percentage ?? 0)}`}>{attempt.percentage?.toFixed(1)}%</span>
                    <p className="text-xs text-ink-400 font-mono">{attempt.correct_count}C / {attempt.incorrect_count}W</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-ink-400 text-sm">No attempts yet. Take a test!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
