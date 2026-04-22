import { useEffect, useState } from "react";

export function useCopyFeedback(duration = 900) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopiedKey(null);
    }, duration);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedKey, duration]);

  return {
    copiedKey,
    isCopied: (key: string) => copiedKey === key,
    markCopied: (key: string) => setCopiedKey(key),
  };
}
