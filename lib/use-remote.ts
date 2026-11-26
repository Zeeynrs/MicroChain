"use client";

import { useEffect, useState } from "react";

type Load<T> = (signal: AbortSignal) => Promise<T>;
type Outcome<T> = { data: T; error?: never } | { data?: never; error: string };

export function useRemote<T>(load: Load<T>) {
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<{ load: Load<T>; attempt: number; outcome: Outcome<T> }>();

  useEffect(() => {
    const request = new AbortController();
    load(request.signal).then(
      (data) => {
        if (!request.signal.aborted) setCompleted({ load, attempt, outcome: { data } });
      },
      (error: unknown) => {
        if (!request.signal.aborted) {
          const message = error instanceof Error ? error.message : "Data belum dapat dimuat.";
          setCompleted({ load, attempt, outcome: { error: message } });
        }
      },
    );
    return () => request.abort();
  }, [load, attempt]);

  const outcome = completed?.load === load && completed.attempt === attempt ? completed.outcome : undefined;
  return { data: outcome?.data, error: outcome?.error, pending: !outcome, retry: () => setAttempt((last) => last + 1) };
}
