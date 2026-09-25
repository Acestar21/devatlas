"use client";

import { useEffect, useState } from "react";
import styles from "./loading.module.css";

export default function Loading() {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoader(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showLoader) return null;

  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <div className={styles.mark} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.ring} />
        <span className={styles.core}>D</span>
      </div>
      <p className={styles.title}>Loading profile<span className={styles.dots}>...</span></p>
      <p className={styles.disclaimer}>
        First load may take up to a minute if the backend has been idle (free hosting).
      </p>
    </div>
  );
}
