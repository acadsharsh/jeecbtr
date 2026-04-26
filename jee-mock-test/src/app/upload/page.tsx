"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Upload, FileText, Copy, Check, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "upload" | "prompt" | "paste";

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [subject, setSubject] = useState("physics");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(30);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
    else toast.error("Please drop a PDF file");
  }, []);

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("subject", subject);
      formData.append("difficulty", difficulty);
      formData.append("questionCount", String(questionCount));

      const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setPrompt(data.prompt);
      setStep("prompt");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExtracting(false);
    }
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportJSON = async () => {
    if (!jsonInput.trim()) { toast.error("Paste the JSON first"); return; }
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error("Invalid JSON format");
      // Store in sessionStorage and redirect to test creator
      sessionStorage.setItem("importedQuestions", jsonInput);
      sessionStorage.setItem("pdfFileName", file?.name || "");
      router.push("/tests/new?from=import");
    } catch {
      toast.error("Invalid JSON — make sure the AI returned the correct format");
    }
  };

  const subjects = ["physics", "chemistry", "mathematics", "mixed"];
  const difficulties = ["easy", "medium", "hard"];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-10">
        <p className="section-label mb-1">Step-by-step</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">Upload PDF</h1>
        <p className="text-ink-500 text-sm mt-2 font-body">
          Extract text → get a prompt → paste to any AI → import JSON → done.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-0 mb-10 border-2 border-ink-900 bg-white">
        {(["upload", "prompt", "paste"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={cn(
              "flex-1 px-4 py-3 flex items-center gap-2 text-sm font-mono font-medium transition-colors",
              i < 2 ? "border-r-2 border-ink-900" : "",
              step === s ? "bg-amber-500 text-ink-900" : step > s ? "bg-ink-100 text-ink-500" : "text-ink-300"
            )}
          >
            <span className="w-5 h-5 border-2 border-current flex items-center justify-center text-xs shrink-0">
              {i + 1}
            </span>
            <span className="capitalize">{s === "paste" ? "Import JSON" : s === "prompt" ? "Copy Prompt" : "Upload PDF"}</span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed border-ink-900 bg-white p-16 text-center transition-colors cursor-pointer",
              isDragging && "bg-amber-50 border-amber-500"
            )}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Upload size={32} className="mx-auto text-ink-400 mb-4" />
            {file ? (
              <div>
                <FileText size={20} className="mx-auto text-amber-500 mb-2" />
                <p className="font-mono text-sm font-medium text-ink-900">{file.name}</p>
                <p className="text-xs text-ink-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="font-body font-medium text-ink-900 mb-1">Drop PDF here or click to browse</p>
                <p className="text-xs text-ink-400">Textbooks, notes, previous year papers</p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="section-label block mb-2">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-neo"
              >
                {subjects.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-neo"
              >
                {difficulties.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-2">No. of Questions</label>
              <input
                type="number"
                min={5}
                max={90}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="input-neo"
              />
            </div>
          </div>

          <button
            onClick={handleExtract}
            disabled={!file || extracting}
            className="btn-neo-amber px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extracting ? (
              <><Loader2 size={16} className="animate-spin" /> Extracting text…</>
            ) : (
              <><ChevronRight size={16} /> Extract & Generate Prompt</>
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: Copy Prompt ────────────────────────────────────────── */}
      {step === "prompt" && (
        <div className="space-y-6">
          <div className="card-neo p-0 overflow-hidden">
            <div className="px-4 py-3 bg-ink-900 text-ink-50 flex items-center justify-between">
              <span className="font-mono text-xs">Generated Prompt — paste this into ChatGPT / Claude / Gemini</span>
              <button onClick={copyPrompt} className="flex items-center gap-1.5 text-xs font-mono hover:text-amber-400 transition-colors">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              value={prompt}
              className="w-full h-80 p-4 font-mono text-xs text-ink-700 bg-ink-50 resize-none focus:outline-none"
            />
          </div>

          <div className="border-2 border-amber-500 bg-amber-50 p-4 text-sm font-body text-ink-800">
            <strong className="font-bold">How to use:</strong> Copy the prompt above → open ChatGPT, Claude.ai, or Gemini → paste and send → copy the JSON response → come back and click Next.
          </div>

          <button onClick={() => setStep("paste")} className="btn-neo-amber px-8 py-3">
            I have the JSON → Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 3: Paste JSON ─────────────────────────────────────────── */}
      {step === "paste" && (
        <div className="space-y-6">
          <div className="card-neo p-0 overflow-hidden">
            <div className="px-4 py-3 bg-ink-900 text-ink-50 flex items-center gap-2">
              <span className="font-mono text-xs">Paste AI-generated JSON here</span>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{\n  "questions": [\n    {\n      "question_number": 1,\n      "question_text": "...",\n      ...\n    }\n  ]\n}`}
              className="w-full h-80 p-4 font-mono text-xs text-ink-700 bg-white resize-none focus:outline-none placeholder:text-ink-300"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("prompt")} className="btn-neo-outline">← Back</button>
            <button onClick={handleImportJSON} className="btn-neo-amber px-8 py-3">
              Import & Create Test →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
