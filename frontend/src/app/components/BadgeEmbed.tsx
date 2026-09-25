"use client";

import { useState } from "react";
import styles from "./BadgeEmbed.module.css";

export default function BadgeEmbed({ username }: { username: string }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const badgeUrl = `${process.env.NEXT_PUBLIC_API_URL}/badge/${encodeURIComponent(username)}`;
  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://devatlas-cyan.vercel.app"}/${username}`;
  const markdown = `[![${username} on DevAtlas](${badgeUrl})](${profileUrl})`;

  const copyCode = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className={styles.embed} aria-label="GitHub README badge">
      <div className={styles.header}>
        <p className={styles.label}>DevAtlas badge</p>
        <div className={styles.tabs} role="tablist" aria-label="Badge display mode">
          <button className={!showCode ? styles.active : ""} onClick={() => setShowCode(false)} role="tab" aria-selected={!showCode}>Preview</button>
          <button className={showCode ? styles.active : ""} onClick={() => setShowCode(true)} role="tab" aria-selected={showCode}>SVG code</button>
        </div>
      </div>
      {showCode ? <div className={styles.codePanel}><code>{markdown}</code><button onClick={copyCode}>{copied ? "Copied" : "Copy"}</button></div> : <a href={`/${username}`} className={styles.preview} aria-label="Open DevAtlas profile"><img src={badgeUrl} alt={`${username} DevAtlas badge`} /></a>}
    </section>
  );
}