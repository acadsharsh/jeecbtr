import { useEffect, useRef, useCallback } from "react";

interface UseAutosaveOptions {
  attemptId: string | null;
  answers: Record<string, string>;
  intervalMs?: number;
  enabled?: boolean;
}

export function useAutosave({
  attemptId,
  answers,
  intervalMs = 30_000,
  enabled = true,
}: UseAutosaveOptions) {
  const answersRef = useRef(answers);
  const attemptIdRef = useRef(attemptId);

  // Keep refs current without triggering re-effect
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);

  const save = useCallback(async () => {
    if (!attemptIdRef.current) return;
    try {
      await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          attempt_id: attemptIdRef.current,
          answers: answersRef.current,
        }),
      });
    } catch {
      // Silent fail on autosave — user will be warned on unload if needed
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(save, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, save]);

  // Save before page unload
  useEffect(() => {
    const handler = () => { save(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [save]);

  return { save };
}
