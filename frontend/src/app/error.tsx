"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import WakeUpLoader from "./components/WakeUpLoader";

export default function RouteError({ reset }: { reset: () => void }) {
  const router = useRouter();

  const retry = () =>
    startTransition(() => {
      router.refresh(); // refetch server components
      reset(); // re-render the errored segment
    });

  return <WakeUpLoader failed onRetry={retry} />;
}