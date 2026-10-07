"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import WakeUpLoader from "./components/WakeUpLoader";

const HEALTH_CHECK_INTERVAL_MS = 5000;

export default function RouteError({ reset }: { reset: () => void }) {
  const router = useRouter();

  const retry = () =>
    startTransition(() => {
      router.refresh(); // refetch server components
      reset(); // re-render the errored segment
    });

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const checkBackend = async () => {
      try {
        const response = await fetch("/api/proxy/health", {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok && !stopped) {
          retry();
          return;
        }
      } catch {
        // The backend is still waking or unreachable; keep the game mounted.
      }
      if (!stopped) {
        timer = window.setTimeout(checkBackend, HEALTH_CHECK_INTERVAL_MS);
      }
    };

    timer = window.setTimeout(checkBackend, HEALTH_CHECK_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
    // retry is intentionally stable for this error boundary instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <WakeUpLoader failed />;
}