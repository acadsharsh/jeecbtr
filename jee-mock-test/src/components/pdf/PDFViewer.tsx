"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Crop, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CropRect } from "@/types";

interface PDFViewerProps {
  questions?: { id: string; question_number: number; question_text: string; diagram_url?: string | null }[];
  onDiagramUploaded?: (questionId: string, url: string) => void;
}

export function PDFViewer({ questions = [], onDiagramUploaded }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfDocRef = useRef<any>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [pdfJsReady, setPdfJsReady] = useState(false);

  // Load PDF.js dynamically
  useEffect(() => {
    if ((window as any).pdfjsLib) { setPdfJsReady(true); return; }
    
    const workerScript = document.createElement("script");
    workerScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    document.head.appendChild(workerScript);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsReady(true);
    };
    document.head.appendChild(script);
  }, []);

  // Auto-select first question
  useEffect(() => {
    if (questions.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questions[0].id);
    }
  }, [questions, selectedQuestionId]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    setLoading(true);
    try {
      const pdfPage = await pdfDocRef.current.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d")!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    } finally {
      setLoading(false);
    }
  }, [scale]);

  useEffect(() => {
    if (pdfLoaded) renderPage(page);
  }, [page, scale, pdfLoaded, renderPage]);

  const loadPDF = async (file: File) => {
    if (!pdfJsReady) { toast.error("PDF viewer still loading, try again in a moment"); return; }
    const pdfjsLib = (window as any).pdfjsLib;
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setPage(1);
      setPdfLoaded(true);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  // ─── Crop drag handlers ───────────────────────────────────────────
  const getRelativePos = (e: React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !overlayRef.current) return;
    e.preventDefault();
    const pos = getRelativePos(e, overlayRef.current);
    setCropStart(pos);
    setCropRect(null);
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !cropStart || !overlayRef.current) return;
    const pos = getRelativePos(e, overlayRef.current);
    setCropRect({
      x: Math.min(cropStart.x, pos.x),
      y: Math.min(cropStart.y, pos.y),
      width: Math.abs(pos.x - cropStart.x),
      height: Math.abs(pos.y - cropStart.y),
    });
  };

  const onMouseUp = () => setIsDragging(false);

  const captureAndUpload = async () => {
    if (!cropRect || !canvasRef.current) return;
    if (cropRect.width < 10 || cropRect.height < 10) { toast.error("Selection too small — drag a larger area"); return; }
    if (!selectedQuestionId) { toast.error("Select a question to attach this diagram to"); return; }

    setUploading(true);
    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.round(cropRect.width);
      offscreen.height = Math.round(cropRect.height);
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(
        canvasRef.current,
        Math.round(cropRect.x), Math.round(cropRect.y),
        Math.round(cropRect.width), Math.round(cropRect.height),
        0, 0,
        Math.round(cropRect.width), Math.round(cropRect.height)
      );

      const blob = await new Promise<Blob>((res) => offscreen.toBlob((b) => res(b!), "image/png"));
      const form = new FormData();
      form.append("image", blob, "diagram.png");
      form.append("question_id", selectedQuestionId);

      const res = await fetch("/api/upload-diagram", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Diagram attached to question!");
      onDiagramUploaded?.(selectedQuestionId, data.url);
      setCropRect(null);
      setCropMode(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const selectedQ = questions.find(q => q.id === selectedQuestionId);

  return (
    <div className="border-2 border-ink-900 bg-white overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-ink-900 bg-ink-900 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadPDF(f); }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-amber-500 text-ink-900 border border-amber-500 hover:bg-amber-400 transition-colors"
        >
          <Upload size={12} /> Open PDF
        </button>

        {pdfLoaded && (
          <>
            <div className="h-4 w-px bg-ink-700" />
            {/* Page nav */}
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1 text-ink-300 hover:text-ink-50 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-ink-300">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1 text-ink-300 hover:text-ink-50 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>

            <div className="h-4 w-px bg-ink-700" />
            {/* Zoom */}
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
              className="p-1 text-ink-300 hover:text-ink-50 transition-colors">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-mono text-ink-300">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))}
              className="p-1 text-ink-300 hover:text-ink-50 transition-colors">
              <ZoomIn size={14} />
            </button>

            <div className="h-4 w-px bg-ink-700" />
            {/* Crop toggle */}
            <button
              onClick={() => { setCropMode(c => !c); setCropRect(null); }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-mono border transition-colors",
                cropMode
                  ? "bg-amber-500 text-ink-900 border-amber-500"
                  : "text-ink-300 border-ink-600 hover:border-ink-400"
              )}
            >
              <Crop size={12} /> {cropMode ? "Cropping…" : "Crop Diagram"}
            </button>

            {/* Upload crop button */}
            {cropRect && (
              <>
                <button
                  onClick={captureAndUpload}
                  disabled={uploading || !selectedQuestionId}
                  className="px-2 py-1 text-xs font-mono bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Attach to Q" + (selectedQ?.question_number ?? "?")}
                </button>
                <button onClick={() => setCropRect(null)}
                  className="p-1 text-ink-400 hover:text-ink-50 transition-colors">
                  <X size={13} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Question selector ────────────────────────────────────────── */}
      {questions.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-ink-200 bg-ink-50">
          <div className="flex items-center gap-1.5 shrink-0">
            <ImageIcon size={13} className="text-ink-500" />
            <span className="text-xs font-mono text-ink-600 font-medium">Attach diagram to:</span>
          </div>
          <select
            value={selectedQuestionId}
            onChange={(e) => setSelectedQuestionId(e.target.value)}
            className="flex-1 text-xs font-body border border-ink-300 bg-white px-2 py-1 focus:outline-none focus:border-ink-900 min-w-0"
          >
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                Q{q.question_number}: {q.question_text.slice(0, 60)}{q.question_text.length > 60 ? "…" : ""}
                {q.diagram_url ? " ✓" : ""}
              </option>
            ))}
          </select>
          {selectedQ?.diagram_url && (
            <span className="text-[10px] font-mono text-emerald-600 shrink-0">✓ has diagram</span>
          )}
        </div>
      )}

      {/* ── Canvas area ──────────────────────────────────────────────── */}
      <div className="overflow-auto bg-ink-100 flex justify-center p-4" style={{ maxHeight: "560px" }}>
        {!pdfLoaded ? (
          <div
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-ink-300 cursor-pointer hover:border-ink-900 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-ink-400 mb-3" />
            <p className="text-sm font-body text-ink-600 font-medium">Click to open a PDF</p>
            <p className="text-xs font-mono text-ink-400 mt-1">
              {pdfJsReady ? "Then use Crop Diagram to select figures" : "Loading PDF viewer…"}
            </p>
          </div>
        ) : (
          <div className="pdf-canvas-wrapper relative select-none">
            <canvas ref={canvasRef} className={cn("block", loading && "opacity-40")} />
            {/* Drag-to-crop overlay */}
            <div
              ref={overlayRef}
              className="absolute inset-0"
              style={{ cursor: cropMode ? "crosshair" : "default" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {cropRect && cropRect.width > 2 && cropRect.height > 2 && (
                <div
                  className="absolute border-2 border-dashed border-amber-500 bg-amber-400/10 pointer-events-none"
                  style={{
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                  }}
                >
                  {/* Corner handles */}
                  {[
                    "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
                    "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                    "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                    "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-2.5 h-2.5 bg-amber-500 border border-white ${cls}`} />
                  ))}
                  <div className="absolute -top-6 left-0 bg-amber-500 text-ink-900 text-[10px] font-mono px-1.5 py-0.5 whitespace-nowrap">
                    {Math.round(cropRect.width)} × {Math.round(cropRect.height)}px
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      {pdfLoaded && (
        <div className={cn(
          "px-4 py-2 text-xs font-mono border-t-2 transition-colors",
          cropMode
            ? "bg-amber-50 border-amber-400 text-amber-700"
            : "bg-ink-50 border-ink-200 text-ink-500"
        )}>
          {cropMode
            ? cropRect
              ? `Selection: ${Math.round(cropRect.width)}×${Math.round(cropRect.height)}px — click "Attach to Q${selectedQ?.question_number ?? "?"}" to save`
              : "🎯 Click and drag on the PDF to select a diagram area"
            : `Page ${page} of ${totalPages} — click "Crop Diagram" to start selecting`
          }
        </div>
      )}
    </div>
  );
}
