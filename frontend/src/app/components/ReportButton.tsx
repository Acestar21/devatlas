"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { proxyFetch } from "@/lib/api-client";
import modal from "./EditProfileModal.module.css";
import styles from "./ReportButton.module.css";

const CATEGORIES: [string, string][] = [
	["inappropriate_image", "Inappropriate image or content"],
	["harassment", "Harassment or hate"],
	["spam", "Spam or scam"],
	["impersonation", "Impersonation"],
	["other", "Something else"],
];

export default function ReportButton({ username }: { username: string }) {
	const [open, setOpen] = useState(false);
	const [category, setCategory] = useState(CATEGORIES[0][0]);
	const [details, setDetails] = useState("");
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const close = () => {
		setOpen(false);
		setDone(null);
		setDetails("");
		setError(null);
	};

	const submit = async () => {
		setBusy(true);
		setError(null);
		try {
			const result = await proxyFetch<{ message: string }>("reports", {
				method: "POST",
				body: JSON.stringify({ username, category, details }),
			});
			setDone(result.message);
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Could not send the report.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<button className={styles.button} onClick={() => setOpen(true)}>
				Report
			</button>
			{open &&
				createPortal(
					<div
						className={modal.backdrop}
						role="presentation"
						onMouseDown={(event) =>
							event.target === event.currentTarget && close()
						}
					>
						<section
							className={modal.modal}
							role="dialog"
							aria-modal="true"
							aria-labelledby="report-title"
						>
							<div className={modal.header}>
								<div>
									<p className={modal.eyebrow}>
										Report profile
									</p>
									<h2 id="report-title">@{username}</h2>
								</div>
								<button
									className={modal.close}
									onClick={close}
									aria-label="Close"
								>
									×
								</button>
							</div>
							{done ? (
								<p className={modal.help}>{done}</p>
							) : (
								<>
									<label className={modal.field}>
										Reason
										<select
											value={category}
											onChange={(event) =>
												setCategory(event.target.value)
											}
										>
											{CATEGORIES.map(
												([value, label]) => (
													<option
														key={value}
														value={value}
													>
														{label}
													</option>
												),
											)}
										</select>
									</label>
									<label className={modal.field}>
										Details (optional)
										<textarea
											rows={4}
											maxLength={500}
											value={details}
											onChange={(event) =>
												setDetails(event.target.value)
											}
											placeholder="What should the moderators look at?"
										/>
									</label>
									<p className={modal.help}>
										Reports are reviewed by moderators.
										Please don&apos;t report profiles just
										because you disagree with them.
									</p>
								</>
							)}
							{error && (
								<p className={modal.error} role="alert">
									{error}
								</p>
							)}
							<div className={modal.actions}>
								<button
									className={modal.cancel}
									onClick={close}
								>
									{done ? "Close" : "Cancel"}
								</button>
								{!done && (
									<button
										className={modal.save}
										onClick={submit}
										disabled={busy}
									>
										{busy ? "Sending..." : "Send report"}
									</button>
								)}
							</div>
						</section>
					</div>,
					document.body,
				)}
		</>
	);
}
