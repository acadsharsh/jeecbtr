import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { formatTime, getScoreColor, getScoreBadge } from "@/lib/utils";
import { BarChart3, CheckCircle, XCircle, MinusCircle, Clock, ArrowLeft, RotateCcw } from "lucide-react";
import type { Attempt, Question, Test } from "@/types";

interface Props {
  params: { slug: string };
  searchParams: { attempt?: string };
}

export default async function ResultsPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const attemptId = searchParams.attempt;
  if (!attemptId) notFound();

  const supabase = createServiceClient();

  const [{ data: attempt }, { data: test }] = await Promise.all([
    supabase.from("attempts").select("*").eq("id", attemptId).eq("clerk_user_id", user.id).single(),
    supabase.from("tests").select("*, questions(*)").eq("slug", params.slug).single(),
  ]);

  if (!attempt || !test) notFound();

  const questions = ((test.questions as Question[]) || []).sort((a, b) => a.question_number - b.question_number);
  const att = attempt as Attempt;
  const pct = att.percentage ?? 0;
  const badge = getScoreBadge(pct);
  const scoreHex = pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#DC2626";
  const topicScores = att.subject_scores as Record<string, { score: number; max: number; correct: number; incorrect: number }> | null;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/tests/${params.slug}`} className="p-2 border-2 border-ink-900 hover:bg-ink-50 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="section-label">Results</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">{(test as Test).title}</h1>
        </div>
      </div>

      <div className="card-neo p-0 overflow-hidden mb-8">
        <div className="bg-ink-900 px-8 py-10 text-center">
          <div className="font-display text-8xl font-black mb-2" style={{ color: scoreHex }}>
            {pct.toFixed(1)}%
          </div>
          <div className="font-mono text-ink-300 text-sm mb-1">{badge}</div>
          <div className="font-display text-2xl text-ink-50 font-bold">{att.score} / {att.max_score}</div>
        </div>
        <div className="grid grid-cols-4 divide-x-2 divide-ink-900 border-t-2 border-ink-900 bg-white">
          {[
            { label: "Correct", value: att.correct_count, icon: CheckCircle, color: "text-emerald-500" },
            { label: "Wrong", value: att.incorrect_count, icon: XCircle, color: "text-crimson-500" },
            { label: "Skipped", value: att.unattempted_count, icon: MinusCircle, color: "text-ink-400" },
            { label: "Time Taken", value: att.time_taken_secs ? formatTime(att.time_taken_secs) : "—", icon: Clock, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="px-6 py-5 text-center">
              <Icon size={16} className={`${color} mx-auto mb-1`} />
              <div className="font-display text-3xl font-bold text-ink-900">{value}</div>
              <div className="section-label mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {topicScores && Object.keys(topicScores).length > 0 && (
        <div className="card-neo p-0 overflow-hidden mb-8">
          <div className="px-5 py-3 border-b-2 border-ink-900 bg-ink-50">
            <span className="section-label">Topic-wise Performance</span>
          </div>
          <div className="divide-y divide-ink-100">
            {Object.entries(topicScores).map(([topic, data]) => {
              const topicPct = data.max > 0 ? (data.score / data.max) * 100 : 0;
              return (
                <div key={topic} className="px-5 py-4 flex items-center gap-4">
                  <span className="font-body text-sm text-ink-900 w-40 truncate">{topic}</span>
                  <div className="flex-1 bg-ink-100 h-2 border border-ink-200 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${Math.max(0, Math.min(100, topicPct))}%`, backgroundColor: topicPct >= 75 ? "#10B981" : topicPct >= 50 ? "#F59E0B" : "#DC2626" }} />
                  </div>
                  <span className="font-mono text-xs text-ink-600 w-20 text-right">{data.score}/{data.max} ({topicPct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-neo p-0 overflow-hidden">
        <div className="px-5 py-3 border-b-2 border-ink-900 bg-ink-900 text-ink-50">
          <span className="font-mono text-xs">Detailed Review</span>
        </div>
        <div className="divide-y divide-ink-100">
          {questions.map((q) => {
            const userAnswer = att.answers[q.id];
            const isCorrect = userAnswer?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
            const isSkipped = !userAnswer;
            const statusColor = isSkipped ? "text-ink-400" : isCorrect ? "text-emerald-600" : "text-crimson-500";
            const StatusIcon = isSkipped ? MinusCircle : isCorrect ? CheckCircle : XCircle;

            return (
              <div key={q.id} className="px-5 py-5">
                <div className="flex items-start gap-3">
                  <StatusIcon size={16} className={`${statusColor} mt-0.5 shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-ink-400">Q{q.question_number}</span>
                      <span className={`font-mono text-xs font-bold ${statusColor}`}>
                        {isSkipped ? "Skipped" : isCorrect ? `+${q.marks_correct}` : `${q.marks_incorrect}`}
                      </span>
                    </div>
                    <p className="font-body text-sm text-ink-900 mb-3">{q.question_text}</p>
                    {q.options && (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt) => {
                          const isUserPick = userAnswer === opt.label;
                          const isCorrectOpt = q.correct_answer.includes(opt.label);
                          return (
                            <div key={opt.label} className={`px-3 py-2 border text-xs flex items-start gap-2 ${isCorrectOpt ? "border-emerald-500 bg-emerald-50" : isUserPick && !isCorrectOpt ? "border-crimson-500 bg-red-50" : "border-ink-200 bg-ink-50"}`}>
                              <span className="font-mono font-bold shrink-0">{opt.label}.</span>
                              <span className="font-body">{opt.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.question_type === "numerical" && (
                      <div className="flex gap-4 text-xs font-mono">
                        <span>Your answer: <strong>{userAnswer || "—"}</strong></span>
                        <span className="text-emerald-600">Correct: <strong>{q.correct_answer}</strong></span>
                      </div>
                    )}
                    {q.explanation && (
                      <div className="mt-3 border-l-4 border-amber-500 pl-3 py-1 bg-amber-50">
                        <p className="text-xs font-mono text-amber-700 font-bold mb-1">Explanation</p>
                        <p className="text-xs font-body text-ink-700">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href={`/tests/${params.slug}`} className="btn-neo-outline"><ArrowLeft size={15} /> Back to Test</Link>
        <Link href={`/tests/${params.slug}/attempt`} className="btn-neo"><RotateCcw size={15} /> Retake Test</Link>
      </div>
    </div>
  );
}
