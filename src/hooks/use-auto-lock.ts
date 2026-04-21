import { useEffect, useRef } from "react";

interface UseAutoLockOptions {
  enabled: boolean;
  minutes: number;
  onLock: () => void;
}

export function useAutoLock({
  enabled,
  minutes,
  onLock,
}: UseAutoLockOptions) {
  const lastActivityRef = useRef(Date.now());
  const lockingRef = useRef(false);

  useEffect(() => {
    if (!enabled || minutes <= 0) {
      lockingRef.current = false;
      return;
    }

    function markActivity() {
      lastActivityRef.current = Date.now();
    }

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "focus",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    const interval = window.setInterval(() => {
      if (lockingRef.current) {
        return;
      }

      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs < minutes * 60_000) {
        return;
      }

      lockingRef.current = true;
      Promise.resolve(onLock()).finally(() => {
        lastActivityRef.current = Date.now();
        lockingRef.current = false;
      });
    }, 10_000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      window.clearInterval(interval);
    };
  }, [enabled, minutes, onLock]);

  return {
    touch() {
      lastActivityRef.current = Date.now();
    },
  };
}
