"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Crop, Upload, X, Image as ImageIcon, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CropRect } from "@/types";

interface PDFViewerProps {
  questions?: { id: string; question_number: number; question_text: string; diagram_url?: string | null }[];
  onDiagramUploaded?: (questionId: string, url: string) => void;
}

export function PDFViewer({ questions = [], onDiagramUploaded }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // scrollable container
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

  // Load PDF.js v3 (non-module, works reliably with Next.js)
  useEffect(() => {
    if ((window as any).pdfjsLib) { setPdfJsReady(true); return; }

    const loadScript = (src: string) =>
      new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        document.head.appendChild(s);
      });

    (async () => {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfJsReady(true);
    })();
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
    if (!pdfJsReady) { toast.error("PDF viewer still loading, please wait"); return; }
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

  // ─── Get mouse position relative to the CANVAS element ────────────
  // This is the key fix: we use the canvas rect + container scroll offset
  // so coordinates always map 1:1 to canvas pixels regardless of scroll.
  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const canvasRect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - canvasRect.left,
      y: e.clientY - canvasRect.top,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (!pos) return;
    setCropStart(pos);
    setCropRect(null);
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !cropStart) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    setCropRect({
      x: Math.min(cropStart.x, pos.x),
      y: Math.min(cropStart.y, pos.y),
      width: Math.abs(pos.x - cropStart.x),
      height: Math.abs(pos.y - cropStart.y),
    });
  };

  const onMouseUp = () => setIsDragging(false);

  // ─── Capture crop from canvas and upload ──────────────────────────
  const captureAndUpload = async () => {
    if (!cropRect || !canvasRef.current) return;
    if (cropRect.width < 5 || cropRect.height < 5) {
      toast.error("Selection too small — drag a bigger area");
      return;
    }
    if (!selectedQuestionId) {
      toast.error("Select a question to attach this diagram to");
      return;
    }

    // Canvas is rendered at device-pixel-ratio 1 since we set canvas.width/height directly.
    // The crop coordinates from getBoundingClientRect are in CSS pixels.
    // The canvas may be scaled by CSS — we need to scale crop coords to canvas pixel space.
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    const px = Math.round(cropRect.x * scaleX);
    const py = Math.round(cropRect.y * scaleY);
    const pw = Math.round(cropRect.width * scaleX);
    const ph = Math.round(cropRect.height * scaleY);

    // Clamp to canvas bounds
    const sx = Math.max(0, px);
    const sy = Math.max(0, py);
    const sw = Math.min(pw, canvas.width - sx);
    const sh = Math.min(ph, canvas.height - sy);

    if (sw <= 0 || sh <= 0) {
      toast.error("Selection is outside the PDF area");
      return;
    }

    setUploading(true);
    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = sw;
      offscreen.height = sh;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob>((res, rej) =>
        offscreen.toBlob(b => b ? res(b) : rej(new Error("Canvas export failed")), "image/png")
      );

      const form = new FormData();
      form.append("image", blob, "diagram.png");
      form.append("question_id", selectedQuestionId);

      const res = await fetch("/api/upload-diagram", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const qNum = questions.find(q => q.id === selectedQuestionId)?.question_number;
      toast.success(`Diagram attached to Q${qNum}!`);
      onDiagramUploaded?.(selectedQuestionId, data.url);
      setCropRect(null);
      setCropMode(false);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const selectedQ = questions.find(q => q.id === selectedQuestionId);

  return (
    <div className="border-2 border-ink-900 bg-white overflow-hidden">

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b-2 border-ink-900 bg-ink-900 flex-wrap">
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadPDF(f); }} />

        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-amber-500 text-ink-900 border border-amber-500 hover:bg-amber-400 transition-colors">
          <Upload size={12} /> Open PDF
        </button>

        {pdfLoaded && (
          <>
            <div className="h-4 w-px bg-ink-700" />
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
            <button
              onClick={() => { setCropMode(c => !c); setCropRect(null); setCropStart(null); }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-mono border transition-colors",
                cropMode ? "bg-amber-500 text-ink-900 border-amber-500" : "text-ink-300 border-ink-600 hover:border-ink-400"
              )}>
              <Crop size={12} /> {cropMode ? "Cropping…" : "Crop Diagram"}
            </button>

            {cropRect && cropRect.width > 5 && cropRect.height > 5 && (
              <>
                <button onClick={captureAndUpload} disabled={uploading || !selectedQuestionId}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-mono bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  {uploading
                    ? <><span className="animate-spin">⏳</span> Uploading…</>
                    : <><CheckCircle size={12} /> Attach to Q{selectedQ?.question_number ?? "?"}</>
                  }
                </button>
                <button onClick={() => { setCropRect(null); setCropStart(null); }}
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
            <span className="text-xs font-mono text-ink-600 font-medium">Attach to:</span>
          </div>
          <select value={selectedQuestionId} onChange={e => setSelectedQuestionId(e.target.value)}
            className="flex-1 text-xs font-body border border-ink-300 bg-white px-2 py-1.5 focus:outline-none focus:border-ink-900 min-w-0">
            {questions.map(q => (
              <option key={q.id} value={q.id}>
                Q{q.question_number}: {q.question_text.slice(0, 55)}{q.question_text.length > 55 ? "…" : ""}
                {q.diagram_url ? "  ✓" : ""}
              </option>
            ))}
          </select>
          {selectedQ?.diagram_url && (
            <span className="text-[10px] font-mono text-emerald-600 shrink-0 flex items-center gap-1">
              <CheckCircle size={10} /> has diagram
            </span>
          )}
        </div>
      )}

      {/* ── Scrollable canvas container ──────────────────────────────── */}
      <div
        ref={containerRef}
        className="overflow-auto bg-ink-100"
        style={{ maxHeight: "560px" }}
      >
        {!pdfLoaded ? (
          <div
            className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-ink-300 m-4 cursor-pointer hover:border-ink-900 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-ink-400 mb-3" />
            <p className="text-sm font-body text-ink-600 font-medium">Click to open a PDF</p>
            <p className="text-xs font-mono text-ink-400 mt-1">
              {pdfJsReady ? "Then use Crop Diagram to select any figure" : "Loading PDF viewer…"}
            </p>
          </div>
        ) : (
          // Position relative so the crop overlay is positioned relative to canvas
          <div className="flex justify-center p-4">
            <div
              className="relative inline-block select-none"
              style={{ cursor: cropMode ? "crosshair" : "default" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <canvas
                ref={canvasRef}
                className={cn("block", loading && "opacity-40")}
              />

              {/* Crop selection box — positioned in CSS pixels over the canvas */}
              {cropMode && cropRect && cropRect.width > 2 && cropRect.height > 2 && (
                <div
                  className="absolute border-2 border-amber-500 bg-amber-400/10 pointer-events-none"
                  style={{
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                  }}
                >
                  {/* Size label */}
                  <div className="absolute -top-5 left-0 bg-amber-500 text-ink-900 text-[9px] font-mono px-1 py-0.5 whitespace-nowrap leading-tight">
                    {Math.round(cropRect.width)} × {Math.round(cropRect.height)}
                  </div>
                  {/* Corner dots */}
                  {["top-0 left-0 -translate-x-1/2 -translate-y-1/2",
                    "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                    "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                    "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-2 h-2 bg-amber-500 border border-white ${cls}`} />
                  ))}
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
            ? cropRect && cropRect.width > 5
              ? `Selected ${Math.round(cropRect.width)}×${Math.round(cropRect.height)}px — click "Attach to Q${selectedQ?.question_number}" to save`
              : "🎯 Click and drag directly on the PDF to select a diagram"
            : `Page ${page} / ${totalPages} — click "Crop Diagram" to start`
          }
        </div>
      )}
    </div>
  );
}
