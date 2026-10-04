"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { proxyFetch } from "@/lib/api-client";
import { MfaStatus } from "@/types-mod";
import styles from "./page.module.css";

// enroll / verify / lock go through /api/mfa/* (not /api/proxy): that route turns the backend's
// session token into an httpOnly cookie so JavaScript never sees it.
async function postMfa<T>(action: "enroll" | "verify" | "lock", body: object = {}): Promise<T> {
	const response = await fetch(`/api/mfa/${action}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = (await response.json().catch(() => null)) as ({ detail?: unknown } & T) | null;
	if (!response.ok) {
		const detail = data?.detail;
		throw new Error(typeof detail === "string" ? detail : "Request failed.");
	}
	return data as T;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });

export default function MfaPanel({ status }: { status: MfaStatus }) {
	const router = useRouter();
	const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
	const [code, setCode] = useState("");
	const [useRecovery, setUseRecovery] = useState(false);
	const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
	const [saved, setSaved] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const run = async (work: () => Promise<void>) => {
		setBusy(true);
		setError(null);
		try {
			await work();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Something went wrong.");
		} finally {
			setBusy(false);
		}
	};

	const startSetup = () => run(async () => {
		setSetup(await proxyFetch<{ secret: string; otpauth_uri: string }>("mfa/setup", { method: "POST" }));
	});

	const enroll = () => run(async () => {
		const result = await postMfa<{ recovery_codes: string[] }>("enroll", { code });
		setRecoveryCodes(result.recovery_codes);
		setSetup(null);
		setCode("");
		router.refresh();
	});

	const verify = () => run(async () => {
		await postMfa("verify", useRecovery ? { recovery_code: code } : { code });
		setCode("");
		router.refresh();
	});

	const lock = () => run(async () => {
		await postMfa("lock");
		router.refresh();
	});

	// Recovery codes are shown exactly once, so this view takes priority until acknowledged.
	if (recoveryCodes) {
		return (
			<main className={styles.page}>
				<section className={styles.panel}>
					<h1>Save your recovery codes</h1>
					<p className={styles.muted}>Each code works once if you lose your authenticator. They will not be shown again.</p>
					<pre className={styles.codes}>{recoveryCodes.join("\n")}</pre>
					<div className={styles.row}>
						<button onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}>Copy</button>
					</div>
					<label className={styles.check}>
						<input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
						I saved these somewhere safe
					</label>
					<div className={styles.row}>
						<button className={styles.primary} disabled={!saved} onClick={() => setRecoveryCodes(null)}>Continue</button>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className={styles.page}>
			<section className={styles.panel}>
				<p className={styles.eyebrow}>Moderator access · {status.role}</p>
				<h1>@{status.username}</h1>

				{status.elevated && status.elevated_until && (
					<>
						<p>Elevated session active until <strong>{formatTime(status.elevated_until)}</strong>.</p>
						<div className={styles.row}>
							<Link href="/mod" className={styles.primary}>Open moderation panel</Link>
							<button onClick={lock} disabled={busy}>End session now</button>
						</div>
					</>
				)}

				{!status.elevated && !status.enrolled && !setup && (
					<>
						<p className={styles.muted}>Moderation requires a second factor. Set up an authenticator app (Google Authenticator, Authy, 1Password, etc.).</p>
						<div className={styles.row}><button className={styles.primary} onClick={startSetup} disabled={busy}>Set up authenticator</button></div>
					</>
				)}

				{!status.enrolled && setup && (
					<>
						<p>1. Scan this QR code with your authenticator app.</p>
						<div className={styles.qr}><QRCodeSVG value={setup.otpauth_uri} size={176} /></div>
						<p className={styles.muted}>Can&apos;t scan? Enter this key manually:</p>
						<code className={styles.secret}>{setup.secret}</code>
						<p>2. Enter the 6-digit code it shows.</p>
						<input className={styles.input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" />
						<div className={styles.row}><button className={styles.primary} onClick={enroll} disabled={busy || code.length !== 6}>Confirm and enable</button></div>
					</>
				)}

				{!status.elevated && status.enrolled && (
					<>
						<p className={styles.muted}>Enter a code to start a 30-minute moderation session.</p>
						<input
							className={styles.input}
							inputMode={useRecovery ? "text" : "numeric"}
							autoComplete="one-time-code"
							maxLength={useRecovery ? 12 : 6}
							value={code}
							onChange={(event) => setCode(event.target.value)}
							onKeyDown={(event) => event.key === "Enter" && code && verify()}
							placeholder={useRecovery ? "XXXXX-XXXXX" : "123456"}
						/>
						{status.locked_until && <p className={styles.error}>Locked until {formatTime(status.locked_until)}.</p>}
						<div className={styles.row}>
							<button className={styles.primary} onClick={verify} disabled={busy || !code}>Verify</button>
							<button onClick={() => { setUseRecovery(!useRecovery); setCode(""); setError(null); }}>
								{useRecovery ? "Use authenticator code" : "Use a recovery code"}
							</button>
						</div>
						<p className={styles.muted}>{status.recovery_codes_left} recovery code(s) left.</p>
					</>
				)}

				{error && <p className={styles.error} role="alert">{error}</p>}
			</section>
		</main>
	);
}