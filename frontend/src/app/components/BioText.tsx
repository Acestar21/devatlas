"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./BioText.module.css";

export default function BioText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState<boolean | null>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = textRef.current;
      setHasOverflow(Boolean(element && element.scrollHeight > element.clientHeight + 1));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [text]);

  return (
    <div className={`${styles.wrapper} ${className || ""}`}>
      <p ref={textRef} className={`${styles.text} ${expanded ? styles.expanded : ""}`}>{text}</p>
      {hasOverflow && <button type="button" className={styles.toggle} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        {expanded ? "Show less" : "Read more"}
      </button>}
    </div>
  );
}
