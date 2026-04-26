import { getUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { formatDate, formatTime } from "@/lib/utils";
import { Clock, BookOpen, Globe, Lock, Play, BarChart3 } from "lucide-react";
import { ShareButton } from "@/components/test/ShareButton";
import { TogglePublicButton } from "@/components/test/TogglePublicButton";
import { MathText } from "@/components/ui/MathText";
import type { Test, Question } from "@/types";

interface Props { params: { slug: string } }

export default async function TestPage({ params }: Props) {
  const user = await getUser();
  const supabase = createServiceClient();

  const { data: test } = await supabase
    .from("tests").select("*, questions(*)")
    .eq("slug", params.slug).single();

  if (!test) notFound();

  const isOwner = test.clerk_user_id === user?.id;
  if (!test.is_public && !isOwner) notFound();

  const questions = (test.questions as Question[]).sort((a, b) => a.question_number - b.question_number);

  const typeBreakdown = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.question_type] = (acc[q.question_type] || 0) + 1;
    return acc;
  }, {});

  const subjectBreakdown = questions.reduce<Record<string, number>>((acc, q) => {
    const key = q.topic || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const difficultyColor: Record<string, string> = {
    easy: "text-emerald-600 border-emerald-600",
    medium: "text-amber-600 border-amber-600",
    hard: "text-crimson-500 border-crimson-500",
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`badge capitalize ${difficultyColor[test.difficulty]}`}>{test.difficulty}</span>
          <span className="badge capitalize text-ink-500 border-ink-300">{test.subject}</span>
          {test.is_public
            ? <span className="badge text-emerald-600 border-emerald-600 flex items-center gap-1"><Globe size={10} /> Public</span>
            : <span className="badge text-ink-400 border-ink-300 flex items-center gap-1"><Lock size={10} /> Private</span>
          }
        </div>
        <h1 className="font-display text-4xl font-bold text-ink-900 mb-2">{test.title}</h1>
        {test.description && <p className="text-ink-500 font-body text-sm">{test.description}</p>}
        <p className="font-mono text-xs text-ink-400 mt-2">
          Created {formatDate(test.created_at)}
          {test.source_pdf_name && ` · From: ${test.source_pdf_name}`}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-0 border-2 border-ink-900 bg-white mb-8">
        {[
          { label: "Questions", value: questions.length, icon: BookOpen },
          { label: "Duration", value: formatTime(test.duration_mins * 60), icon: Clock },
          { label: "Total Marks", value: test.total_marks, icon: BarChart3 },
          { label: "Marks/Q", value: "4 / −1", icon: BarChart3 },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`px-6 py-5 ${i < 3 ? "border-r-2 border-ink-900" : ""}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-ink-400" />
                <span className="section-label">{s.label}</span>
              </div>
              <div className="font-display text-2xl font-bold text-ink-900">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-10">
        <Link href={`/tests/${params.slug}/attempt`} className="btn-neo-amber px-6 py-2.5">
          <Play size={15} /> Start Test
        </Link>
        {isOwner && (
          <>
            <TogglePublicButton testId={test.id} isPublic={test.is_public} />
            <ShareButton slug={params.slug} isPublic={test.is_public} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Questions list with math preview */}
        <div className="lg:col-span-2 card-neo p-0 overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-ink-900 bg-ink-900 text-ink-50">
            <span className="font-mono text-xs">Questions Preview</span>
          </div>
          <div className="divide-y divide-ink-100 max-h-[600px] overflow-y-auto">
            {questions.map(q => (
              <div key={q.id} className="px-5 py-4 hover:bg-ink-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-ink-400 mt-0.5 w-6 shrink-0">{q.question_number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-body text-ink-900 line-clamp-2 leading-relaxed">
                      <MathText text={q.question_text} />
                    </div>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="badge text-ink-400 border-ink-200 text-[10px] capitalize">
                        {q.question_type.replace("_", " ")}
                      </span>
                      {q.topic && <span className="badge text-amber-600 border-amber-300 text-[10px]">{q.topic}</span>}
                      {q.diagram_url && <span className="badge text-blue-600 border-blue-300 text-[10px]">📷 diagram</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card-neo p-0 overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-ink-900 bg-ink-50">
              <span className="section-label">Question Types</span>
            </div>
            <div className="p-4 space-y-2">
              {Object.entries(typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-body capitalize text-ink-600">{type.replace("_", " ")}</span>
                  <span className="font-mono text-sm font-bold text-ink-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(subjectBreakdown).length > 1 && (
            <div className="card-neo p-0 overflow-hidden">
              <div className="px-4 py-3 border-b-2 border-ink-900 bg-ink-50">
                <span className="section-label">Topics Covered</span>
              </div>
              <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(subjectBreakdown).map(([topic, count]) => (
                  <div key={topic} className="flex items-center justify-between">
                    <span className="text-xs font-body text-ink-600 truncate max-w-[140px]">{topic}</span>
                    <span className="font-mono text-xs font-bold text-ink-900 shrink-0 ml-2">{count}Q</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-neo p-4">
            <p className="section-label mb-3">Marking Scheme</p>
            <div className="space-y-1.5 text-sm font-body">
              <div className="flex justify-between"><span className="text-ink-600">Correct</span><span className="font-mono font-bold text-emerald-600">+4</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Wrong (MCQ)</span><span className="font-mono font-bold text-crimson-500">−1</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Unattempted</span><span className="font-mono font-bold text-ink-400">0</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Numerical/Multi</span><span className="font-mono font-bold text-ink-400">0</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
