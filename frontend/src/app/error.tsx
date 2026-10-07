"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import WakeUpLoader from "./components/WakeUpLoader";

const RETRY_INTERVAL_MS = 5000;

export default function RouteError({ reset }: { reset: () => void }) {
  const router = useRouter();

  const retry = () =>
    startTransition(() => {
      router.refresh(); // refetch server components
      reset(); // re-render the errored segment
    });

  useEffect(() => {
    const id = window.setInterval(retry, RETRY_INTERVAL_MS);
    return () => window.clearInterval(id);
    // retry is intentionally stable for this error boundary instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <WakeUpLoader failed onRetry={retry} />;
}