"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Crop, Upload, X } from "lucide-react";
import type { CropRect } from "@/types";

interface PDFViewerProps {
  questionId?: string;
  onDiagramUploaded?: (url: string) => void;
}

export function PDFViewer({ questionId, onDiagramUploaded }: PDFViewerProps) {
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

  // Load PDF.js from CDN
  useEffect(() => {
    if ((window as any).pdfjsLib) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
    script.type = "module";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";
    };
    document.head.appendChild(script);
  }, []);

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
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) { toast.error("PDF.js not loaded yet, try again"); return; }
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

  // ─── Crop handlers ────────────────────────────────────────────────
  const getRelativePos = (e: React.MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cropMode || !overlayRef.current) return;
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

  const onMouseUp = () => { setIsDragging(false); };

  const captureAndUpload = async () => {
    if (!cropRect || !canvasRef.current) return;
    if (cropRect.width < 10 || cropRect.height < 10) {
      toast.error("Selection too small");
      return;
    }

    setUploading(true);
    try {
      // Create a cropped canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = cropRect.width;
      offscreen.height = cropRect.height;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(
        canvasRef.current,
        cropRect.x, cropRect.y, cropRect.width, cropRect.height,
        0, 0, cropRect.width, cropRect.height
      );

      const blob = await new Promise<Blob>((res) => offscreen.toBlob((b) => res(b!), "image/png"));
      const form = new FormData();
      form.append("image", blob, "diagram.png");
      if (questionId) form.append("question_id", questionId);

      const res = await fetch("/api/upload-diagram", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Diagram uploaded!");
      onDiagramUploaded?.(data.url);
      setCropRect(null);
      setCropMode(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-ink-900 bg-white overflow-hidden">
      {/* Toolbar */}
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
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 text-ink-300 hover:text-ink-50 disabled:opacity-30 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-mono text-ink-300">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 text-ink-300 hover:text-ink-50 disabled:opacity-30 transition-colors">
              <ChevronRight size={14} />
            </button>
            <div className="h-4 w-px bg-ink-700" />
            {/* Zoom */}
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="p-1 text-ink-300 hover:text-ink-50 transition-colors">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-mono text-ink-300">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="p-1 text-ink-300 hover:text-ink-50 transition-colors">
              <ZoomIn size={14} />
            </button>
            <div className="h-4 w-px bg-ink-700" />
            {/* Crop */}
            <button
              onClick={() => { setCropMode((c) => !c); setCropRect(null); }}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-mono border transition-colors ${
                cropMode ? "bg-amber-500 text-ink-900 border-amber-500" : "text-ink-300 border-ink-600 hover:border-ink-400"
              }`}
            >
              <Crop size={12} /> {cropMode ? "Cropping…" : "Crop Diagram"}
            </button>
            {cropRect && (
              <>
                <button
                  onClick={captureAndUpload}
                  disabled={uploading}
                  className="px-2 py-1 text-xs font-mono bg-emerald-500 text-white border border-emerald-600 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Upload Crop"}
                </button>
                <button onClick={() => setCropRect(null)} className="p-1 text-ink-400 hover:text-ink-50 transition-colors">
                  <X size={13} />
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="overflow-auto max-h-[600px] bg-ink-100 flex justify-center p-4">
        {!pdfLoaded ? (
          <div
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-ink-300 cursor-pointer hover:border-ink-900 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-ink-400 mb-2" />
            <p className="text-sm font-body text-ink-500">Click "Open PDF" or drop a file here</p>
            <p className="text-xs font-mono text-ink-400 mt-1">Then drag to crop any diagram</p>
          </div>
        ) : (
          <div className="pdf-canvas-wrapper relative">
            <canvas ref={canvasRef} className={loading ? "opacity-50" : ""} />
            {/* Crop overlay */}
            <div
              ref={overlayRef}
              className="absolute inset-0"
              style={{ cursor: cropMode ? "crosshair" : "default" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            >
              {cropRect && (
                <div
                  className="crop-overlay"
                  style={{
                    left: cropRect.x,
                    top: cropRect.y,
                    width: cropRect.width,
                    height: cropRect.height,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {cropMode && (
        <div className="px-4 py-2 bg-amber-50 border-t-2 border-amber-500 text-xs font-mono text-amber-700">
          🎯 Drag on the PDF to select a diagram area, then click "Upload Crop" to attach it to the question.
        </div>
      )}
    </div>
  );
}
