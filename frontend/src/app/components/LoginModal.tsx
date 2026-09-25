"use client";

import { useRouter } from "next/navigation";
import styles from "./LoginModal.module.css";

export default function LoginModal() {
  const router = useRouter();
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/github/login`;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className={styles.modal}>
        <button type="button" className={styles.close} onClick={() => router.push("/directory")} aria-label="Close login">×</button>
        <p className={styles.eyebrow}>DevAtlas access</p>
        <h2 id="login-title">Log in with GitHub</h2>
        <p>Connect your developer profile to edit your card and discover people in the directory.</p>
        <a className={styles.loginButton} href={loginUrl}>Continue with GitHub</a>
      </div>
    </div>
  );
}
