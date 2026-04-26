import { useState, useEffect, useRef, useCallback } from "react";

interface UseTimerOptions {
  initialSeconds: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

export function useTimer({ initialSeconds, onExpire, autoStart = true }: UseTimerOptions) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimestampRef = useRef<number>(Date.now());

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = useCallback(() => {
    setIsRunning(true);
    startTimestampRef.current = Date.now();
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    clear();
  }, []);

  const reset = useCallback(() => {
    clear();
    setSeconds(initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) { clear(); return; }

    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clear();
          setIsRunning(false);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return clear;
  }, [isRunning, onExpire]);

  const elapsed = initialSeconds - seconds;

  return {
    seconds,
    elapsed,
    isRunning,
    isExpired: seconds === 0,
    isUrgent: seconds <= 300 && seconds > 0,
    start,
    pause,
    reset,
  };
}
