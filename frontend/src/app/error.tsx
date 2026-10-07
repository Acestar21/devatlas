"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./components/WakeUpLoader.module.css";

export default function RouteError({ reset }: { reset: () => void }) {
  const router = useRouter();

  const retry = () =>
    startTransition(() => {
      router.refresh(); // refetch server components
      reset(); // re-render the errored segment
    });

  useEffect(() => {
    const id = window.setInterval(retry, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.loading} role="alert">
      <p className={styles.title}>Waking the server up…</p>
      <p className={styles.disclaimer}>
        DevAtlas runs on free hosting that can take a minute to wake up. Retrying automatically.
      </p>
      <button className={styles.retry} onClick={retry}>Try now</button>
    </div>
  );
}