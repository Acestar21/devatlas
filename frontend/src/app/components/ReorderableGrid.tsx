"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { proxyFetch } from "@/lib/api-client";
import { ChevronIcon, GripIcon } from "./icons";
import styles from "./ReorderableGrid.module.css";

export interface GridCard {
	id: string;
	label: string;
	/** 1 = half width, 2 = full width */
	span: 1 | 2;
	node: React.ReactNode;
}

/**
 * The profile's main card grid. Visitors just see the cards in the owner's order.
 * The owner gets a "Rearrange" mode with drag handles (mouse) and up/down
 * buttons (touch + keyboard). Order is saved once, when they press Done.
 * Dependency-free: native HTML5 drag and drop.
 *
 * Render this with key={savedOrder.join()} so a refresh after saving re-seeds it.
 */
export default function ReorderableGrid({
	cards,
	savedOrder,
	canEdit,
}: {
	cards: GridCard[];
	savedOrder: string[];
	canEdit: boolean;
}) {
	const router = useRouter();
	const [order, setOrder] = useState<string[]>(savedOrder);
	const [editing, setEditing] = useState(false);
	const [dragId, setDragId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const ordered = useMemo(() => {
		const byId = new Map(cards.map((card) => [card.id, card]));
		const result: GridCard[] = [];
		const seen = new Set<string>();
		for (const id of order) {
			const card = byId.get(id);
			if (card && !seen.has(id)) {
				result.push(card);
				seen.add(id);
			}
		}
		// cards the saved order doesn't know about (new features) keep their default place at the end
		for (const card of cards) if (!seen.has(card.id)) result.push(card);
		return result;
	}, [cards, order]);

	const ids = ordered.map((card) => card.id);

	const moveTo = (id: string, target: number) => {
		const from = ids.indexOf(id);
		if (from === -1 || target < 0 || target >= ids.length || from === target) return;
		const next = [...ids];
		next.splice(target, 0, next.splice(from, 1)[0]);
		setOrder(next);
	};

	const finish = async (save: boolean) => {
		if (!save) {
			setOrder(savedOrder);
			setEditing(false);
			setError(null);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await proxyFetch("profiles/me", {
				method: "PATCH",
				body: JSON.stringify({ layout: { main: ids } }),
			});
			setEditing(false);
			router.refresh();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not save the layout.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className={styles.root}>
			{canEdit && (
				<div className={styles.toolbar}>
					{editing ? (
						<>
							<span className={styles.hint}>Drag cards, or use the arrows.</span>
							<button type="button" className={styles.ghost} onClick={() => setOrder([])} disabled={saving}>
								Reset
							</button>
							<button type="button" className={styles.ghost} onClick={() => finish(false)} disabled={saving}>
								Cancel
							</button>
							<button type="button" className={styles.primary} onClick={() => finish(true)} disabled={saving}>
								{saving ? "Saving..." : "Done"}
							</button>
						</>
					) : (
						<button type="button" className={styles.ghost} onClick={() => setEditing(true)}>
							Rearrange cards
						</button>
					)}
				</div>
			)}
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
			<div className={`${styles.grid} ${editing ? styles.editing : ""}`}>
				{ordered.map((card, index) => (
					<div
						key={card.id}
						className={[
							styles.cell,
							card.span === 2 ? styles.full : "",
							dragId === card.id ? styles.dragging : "",
							overId === card.id && dragId !== card.id ? styles.over : "",
						].join(" ")}
						draggable={editing}
						onDragStart={(event) => {
							if (!editing) return;
							setDragId(card.id);
							event.dataTransfer.effectAllowed = "move";
							event.dataTransfer.setData("text/plain", card.id);
						}}
						onDragOver={(event) => {
							if (!editing || !dragId) return;
							event.preventDefault();
							setOverId(card.id);
						}}
						onDrop={(event) => {
							if (!editing || !dragId) return;
							event.preventDefault();
							moveTo(dragId, index);
							setDragId(null);
							setOverId(null);
						}}
						onDragEnd={() => {
							setDragId(null);
							setOverId(null);
						}}
					>
						<div className={styles.content}>{card.node}</div>
						{editing && (
							<div className={styles.controls}>
								<span className={styles.grip} aria-hidden="true">
									<GripIcon />
								</span>
								<span className={styles.name}>{card.label}</span>
								<button
									type="button"
									onClick={() => moveTo(card.id, index - 1)}
									disabled={index === 0}
									aria-label={`Move ${card.label} earlier`}
								>
									<ChevronIcon dir="up" />
								</button>
								<button
									type="button"
									onClick={() => moveTo(card.id, index + 1)}
									disabled={index === ordered.length - 1}
									aria-label={`Move ${card.label} later`}
								>
									<ChevronIcon dir="down" />
								</button>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
