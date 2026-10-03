"use client";

import { useEffect, useState } from "react";

export function usePoll<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as T & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "помилка");
        if (!stop) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "помилка");
      }
    };
    void load();
    const id = setInterval(load, 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [url, nonce]);

  return { data, error, reload: () => setNonce((n) => n + 1) };
}
