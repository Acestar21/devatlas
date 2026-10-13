"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { proxyFetch } from "@/lib/api-client";
import styles from "./page.module.css";

/** Staff only (the page only renders this for moderators/admins; the API enforces it too). */
export default function RemoveEntryButton({ id }: { id: number }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	return (
		<button
			type="button"
			className={styles.remove}
			disabled={busy}
			onClick={async () => {
				if (!window.confirm("Remove this entry? This is logged.")) return;
				setBusy(true);
				try {
					await proxyFetch(`journal/${id}`, { method: "DELETE" });
					router.refresh();
				} finally {
					setBusy(false);
				}
			}}
		>
			Remove
		</button>
	);
}
