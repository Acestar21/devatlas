"use client";

import styles from "./components/WakeUpLoader.module.css";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <div className={styles.loading} role="alert">
      <p className={styles.title}>Couldn&apos;t reach the server</p>
      <p className={styles.disclaimer}>
        DevAtlas runs on free hosting that can take a minute to wake up. Give it a moment, then try again.
      </p>
      <button className={styles.retry} onClick={reset}>Try again</button>
    </div>
  );
}