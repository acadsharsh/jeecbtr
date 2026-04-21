"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatTime, cn } from "@/lib/utils";
import { Flag, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import type { Test, Question, AnswerMap } from "@/types";

export default function AttemptPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Fetch test by slug
        const res = await fetch(`/api/tests/by-slug/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const qs: Question[] = (data.questions || []).sort(
          (a: Question, b: Question) => a.question_number - b.question_number
        );
        setTest(data);
        setQuestions(qs);
        setTimeLeft(data.duration_mins * 60);

        // Start attempt
        const ar = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", test_id: data.id }),
        });
        const ad = await ar.json();
        setAttemptId(ad.attempt_id);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Timer
  useEffect(() => {
    if (!test || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); handleSubmit(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [test]);

  // Autosave every 30s
  useEffect(() => {
    if (!attemptId) return;
    saveIntervalRef.current = setInterval(() => autosave(), 30000);
    return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current); };
  }, [attemptId, answers]);

  const autosave = useCallback(async () => {
    if (!attemptId) return;
    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", attempt_id: attemptId, answers }),
    });
  }, [attemptId, answers]);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  };

  const handleSubmit = async (auto = false) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", attempt_id: attemptId, answers, time_taken_secs: timeTaken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/tests/${slug}/results?attempt=${attemptId}`);
    } catch (err: any) {
      toast.error(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin text-ink-400" />
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return <div className="p-8 text-ink-500">Test not found or has no questions.</div>;
  }

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const urgent = timeLeft < 300;

  return (
    <div className="flex h-screen bg-ink-50 overflow-hidden">
      {/* ── Left: Question panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="border-b-2 border-ink-900 bg-white px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-ink-900 truncate max-w-xs">{test.title}</span>
            <span className="badge text-ink-400 border-ink-300 font-mono">
              Q {current + 1}/{questions.length}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn("font-mono text-xl font-bold tabular-nums", urgent && "timer-urgent")}>
              {formatTime(timeLeft)}
            </div>
            {confirmSubmit ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-ink-500 font-mono">Sure?</span>
                <button onClick={() => handleSubmit(false)} className="btn-neo text-xs px-3 py-1.5 bg-crimson-500 border-crimson-500 text-white">
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : "Yes, Submit"}
                </button>
                <button onClick={() => setConfirmSubmit(false)} className="btn-neo-outline text-xs px-3 py-1.5">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmSubmit(true)} className="btn-neo text-xs px-4 py-2">
                <Send size={13} /> Submit
              </button>
            )}
          </div>
        </div>

        {/* Question body */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Question header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink-400">Q{q.question_number}</span>
                <span className="badge capitalize text-ink-400 border-ink-300 text-[10px]">
                  {q.question_type.replace("_", " ")}
                </span>
                <span className="badge text-amber-600 border-amber-400 text-[10px]">
                  +{q.marks_correct} / {q.marks_incorrect}
                </span>
              </div>
              <button
                onClick={() => toggleFlag(q.id)}
                className={cn(
                  "flex items-center gap-1 text-xs font-mono px-2 py-1 border transition-colors",
                  flagged.has(q.id)
                    ? "bg-amber-100 border-amber-500 text-amber-700"
                    : "border-ink-300 text-ink-400 hover:border-ink-900"
                )}
              >
                <Flag size={12} />
                {flagged.has(q.id) ? "Flagged" : "Flag"}
              </button>
            </div>

            {/* Diagram */}
            {q.diagram_url && (
              <div className="mb-6 border-2 border-ink-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.diagram_url} alt="Diagram" className="max-w-full max-h-64 object-contain mx-auto p-2" />
              </div>
            )}

            {/* Question text */}
            <p className="font-body text-base text-ink-900 leading-relaxed mb-8 whitespace-pre-wrap">{q.question_text}</p>

            {/* MCQ Options */}
            {q.question_type !== "numerical" && q.options && (
              <div className="space-y-3">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.label;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleAnswer(q.id, opt.label)}
                      className={cn(
                        "w-full text-left px-5 py-4 border-2 transition-all duration-100 flex items-start gap-4",
                        selected
                          ? "border-amber-500 bg-amber-50 shadow-ink-sm"
                          : "border-ink-900 bg-white hover:bg-ink-50 hover:shadow-ink-sm"
                      )}
                    >
                      <span className={cn(
                        "font-mono text-sm font-bold w-6 h-6 border-2 flex items-center justify-center shrink-0 mt-0.5",
                        selected ? "bg-amber-500 border-amber-500 text-ink-900" : "border-ink-400 text-ink-400"
                      )}>
                        {opt.label}
                      </span>
                      <span className="font-body text-sm text-ink-900 leading-relaxed">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Numerical Input */}
            {q.question_type === "numerical" && (
              <div>
                <label className="section-label block mb-2">Your Answer (numerical)</label>
                <input
                  type="number"
                  step="any"
                  value={answers[q.id] || ""}
                  onChange={(e) => handleAnswer(q.id, e.target.value)}
                  placeholder="Enter numerical value"
                  className="input-neo w-64 font-mono text-lg"
                />
              </div>
            )}

            {/* Multi-correct hint */}
            {q.question_type === "multi_correct" && (
              <p className="text-xs text-ink-400 font-mono mt-3">
                ⚠ One or more options may be correct. Select all that apply (enter as A,C or B,D).
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t-2 border-ink-900 bg-white px-8 py-4 flex items-center justify-between shrink-0">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="btn-neo-outline text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <div className="text-xs font-mono text-ink-400">
            {answered} answered · {questions.length - answered} remaining
          </div>
          <button
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            disabled={current === questions.length - 1}
            className="btn-neo text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Right: Question palette ───────────────────────────────── */}
      <div className="w-56 border-l-2 border-ink-900 bg-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b-2 border-ink-900 bg-ink-900">
          <p className="text-xs font-mono text-ink-300">Question Palette</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-1.5">
            {questions.map((question, i) => {
              const isAnswered = !!answers[question.id];
              const isCurrent = current === i;
              const isFlagged = flagged.has(question.id);
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "q-btn",
                    isCurrent && "q-btn-active",
                    isAnswered ? "q-btn-answered" : isFlagged ? "q-btn-skipped" : "q-btn-unattempted"
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="border-t-2 border-ink-900 p-3 space-y-1.5">
          {[
            { cls: "q-btn-answered", label: "Answered" },
            { cls: "q-btn-skipped", label: "Flagged" },
            { cls: "q-btn-unattempted", label: "Not attempted" },
          ].map(({ cls, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-5 h-5 border-2 border-ink-900 text-[8px] flex items-center justify-center ${cls}`} />
              <span className="text-[10px] font-mono text-ink-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
