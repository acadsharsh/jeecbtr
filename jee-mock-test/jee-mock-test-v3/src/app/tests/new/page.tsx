"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Trash2, Eye, EyeOff, Image as ImageIcon, CheckCircle } from "lucide-react";
import { PDFViewer } from "@/components/pdf/PDFViewer";
import type { GeneratedQuestion, Subject, Difficulty } from "@/types";

type QuestionWithDiagram = GeneratedQuestion & { diagram_url?: string };

type CreatedQuestion = {
  id: string; // real DB uuid
  question_number: number;
  question_text: string;
  diagram_url: string | null;
};

type PageState =
  | { stage: "build" }                              // composing questions
  | { stage: "diagrams"; testSlug: string; questions: CreatedQuestion[] }  // test saved, attach diagrams
  | { stage: "done"; testSlug: string };            // finished

export default function NewTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromImport = searchParams.get("from") === "import";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<Subject>("physics");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [durationMins, setDurationMins] = useState(180);
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<QuestionWithDiagram[]>([]);
  const [jsonRaw, setJsonRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "questions">("details");
  const [pageState, setPageState] = useState<PageState>({ stage: "build" });

  useEffect(() => {
    if (fromImport) {
      const stored = sessionStorage.getItem("importedQuestions");
      const fileName = sessionStorage.getItem("pdfFileName") || "";
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setQuestions(parsed.questions || []);
          setJsonRaw(stored);
          setPdfFileName(fileName);
          if (fileName) setTitle(fileName.replace(".pdf", "").replace(/_/g, " "));
          toast.success(`Loaded ${parsed.questions?.length} questions`);
          setActiveTab("questions");
        } catch {
          toast.error("Failed to parse imported questions");
        }
        sessionStorage.removeItem("importedQuestions");
        sessionStorage.removeItem("pdfFileName");
      }
    }
  }, [fromImport]);

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonRaw);
      if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error();
      setQuestions(parsed.questions);
      toast.success(`Loaded ${parsed.questions.length} questions`);
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  // ── Step 1: Save test to DB, get back real question IDs ────────────
  const handleCreateTest = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (questions.length === 0) { toast.error("Add at least one question"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, subject, difficulty,
          duration_mins: durationMins,
          is_public: isPublic,
          source_pdf_name: pdfFileName || null,
          questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Fetch questions with their real DB IDs
      const qRes = await fetch(`/api/tests/by-slug/${data.test.slug}`);
      const qData = await qRes.json();
      const createdQuestions: CreatedQuestion[] = (qData.questions || []).map((q: any) => ({
        id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        diagram_url: q.diagram_url,
      }));

      toast.success("Test created! Now attach diagrams (or skip).");
      setPageState({ stage: "diagrams", testSlug: data.test.slug, questions: createdQuestions });
    } catch (err: any) {
      toast.error(err.message || "Failed to create test");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: PDFViewer calls this when a diagram is uploaded ────────
  // At this point questionId is a REAL DB uuid
  const handleDiagramUploaded = (questionId: string, url: string) => {
    if (pageState.stage !== "diagrams") return;
    setPageState({
      ...pageState,
      questions: pageState.questions.map(q =>
        q.id === questionId ? { ...q, diagram_url: url } : q
      ),
    });
    toast.success(`Diagram attached to Q${pageState.questions.find(q => q.id === questionId)?.question_number}`);
  };

  // ── Navigate to test when done ─────────────────────────────────────
  const goToTest = () => {
    if (pageState.stage === "diagrams" || pageState.stage === "done") {
      window.location.href = `/tests/${pageState.testSlug}`;
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // STAGE: diagrams — test already saved, attach diagrams with real IDs
  // ════════════════════════════════════════════════════════════════════
  if (pageState.stage === "diagrams") {
    const { questions: createdQs, testSlug } = pageState;
    const withDiagram = createdQs.filter(q => q.diagram_url).length;

    return (
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <p className="section-label mb-1">Step 2 of 2 — Optional</p>
          <h1 className="font-display text-3xl font-bold text-ink-900">Attach Diagrams</h1>
          <p className="text-sm text-ink-500 mt-1 font-body">
            Your test is saved. Open a PDF, crop any figure, and attach it to a question.
          </p>
        </div>

        {/* Progress */}
        <div className="border-2 border-ink-900 bg-white mb-6 overflow-hidden">
          <div className="px-4 py-3 bg-ink-50 border-b border-ink-200 flex items-center justify-between">
            <span className="section-label">{withDiagram} / {createdQs.length} questions have diagrams</span>
            <button onClick={goToTest} className="btn-neo-outline text-xs">
              {withDiagram === 0 ? "Skip →" : "Done, View Test →"}
            </button>
          </div>
          <div className="divide-y divide-ink-100 max-h-40 overflow-y-auto">
            {createdQs.map(q => (
              <div key={q.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="font-mono text-xs text-ink-400 w-6 shrink-0">Q{q.question_number}</span>
                <span className="flex-1 text-xs font-body text-ink-700 truncate">{q.question_text.slice(0, 80)}</span>
                {q.diagram_url
                  ? <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  : <span className="w-3.5 h-3.5 border-2 border-ink-300 shrink-0" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-body text-ink-800 mb-5">
          <strong>How:</strong> Open a PDF → click <strong>Crop Diagram</strong> → drag to select a figure →
          pick the question from the dropdown → click <strong>Attach to Q#</strong>.
        </div>

        {/* PDF Viewer — uses real DB question IDs */}
        <PDFViewer
          questions={createdQs}
          onDiagramUploaded={handleDiagramUploaded}
        />

        <div className="mt-5 flex gap-3">
          <button onClick={goToTest} className="btn-neo-amber px-8 py-3">
            {withDiagram > 0 ? "Done — View Test →" : "Skip Diagrams →"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGE: build — compose the test
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <p className="section-label mb-1">Create</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">New Test</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-2 border-ink-900 mb-8 bg-white">
        {(["details", "questions"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-mono font-medium transition-colors capitalize ${
              activeTab === tab ? "bg-ink-900 text-ink-50" : "text-ink-500 hover:text-ink-900"
            }`}>
            {tab}{tab === "questions" && questions.length > 0 ? ` (${questions.length})` : ""}
          </button>
        ))}
      </div>

      {/* ── Details tab ───────────────────────────────────────────────── */}
      {activeTab === "details" && (
        <div className="space-y-5">
          <div>
            <label className="section-label block mb-2">Test Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Physics Chapter 5 — Laws of Motion" className="input-neo" />
          </div>
          <div>
            <label className="section-label block mb-2">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Optional description…" className="input-neo resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="section-label block mb-2">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value as Subject)} className="input-neo">
                {["physics", "chemistry", "mathematics", "mixed"].map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="section-label block mb-2">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="input-neo">
                {["easy", "medium", "hard"].map(d => (
                  <option key={d} value={d} className="capitalize">{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="section-label block mb-2">Duration (minutes)</label>
              <input type="number" min={10} max={360} value={durationMins}
                onChange={e => setDurationMins(Number(e.target.value))} className="input-neo" />
            </div>
            <div>
              <label className="section-label block mb-2">Visibility</label>
              <button type="button" onClick={() => setIsPublic(!isPublic)}
                className={`w-full input-neo flex items-center gap-2 justify-center cursor-pointer ${
                  isPublic ? "bg-emerald-50 border-emerald-500" : ""
                }`}>
                {isPublic ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} />}
                {isPublic ? "Public — anyone with link" : "Private — only you"}
              </button>
            </div>
          </div>
          <button onClick={() => setActiveTab("questions")} className="btn-neo-amber px-8 py-3">
            Next: Add Questions →
          </button>
        </div>
      )}

      {/* ── Questions tab ─────────────────────────────────────────────── */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          <div className="card-neo p-0 overflow-hidden">
            <div className="px-4 py-3 bg-ink-100 border-b-2 border-ink-900">
              <p className="font-mono text-xs font-medium text-ink-700">Paste Questions JSON</p>
            </div>
            <div className="p-4">
              <textarea value={jsonRaw} onChange={e => setJsonRaw(e.target.value)} rows={6}
                className="w-full font-mono text-xs text-ink-700 bg-ink-50 border border-ink-200 p-3 resize-none focus:outline-none focus:border-ink-900"
                placeholder='{"questions": [...]}' />
              <button onClick={handleJsonImport} className="btn-neo-outline text-xs mt-2">
                Load Questions from JSON
              </button>
            </div>
          </div>

          {questions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">{questions.length} Questions loaded</p>
                <p className="font-mono text-xs text-ink-500">
                  Total marks: {questions.reduce((s, q) => s + q.marks_correct, 0)}
                </p>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {questions.map((q, i) => (
                  <div key={i} className="border-2 border-ink-900 bg-white p-3 flex items-start gap-3">
                    <span className="font-mono text-xs font-bold text-ink-400 mt-0.5 w-6 shrink-0">
                      {q.question_number ?? i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-ink-900 line-clamp-2">{q.question_text}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="badge text-ink-400 border-ink-200 text-[10px]">{q.question_type}</span>
                        <span className="badge text-amber-600 border-amber-400 text-[10px]">+{q.marks_correct}/{q.marks_incorrect}</span>
                        {q.topic && <span className="badge text-ink-400 border-ink-200 text-[10px]">{q.topic}</span>}
                      </div>
                    </div>
                    <button onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-ink-300 hover:text-crimson-500 transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-2 border-ink-200 bg-ink-50 px-4 py-3 text-xs font-body text-ink-600">
            <strong className="font-medium">Diagrams</strong> — you can attach PDF diagrams to questions
            in the next step, after the test is saved.
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setActiveTab("details")} className="btn-neo-outline">← Back</button>
            <button onClick={handleCreateTest} disabled={saving || questions.length === 0}
              className="btn-neo-amber px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                : <>Save Test &amp; Add Diagrams →</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
