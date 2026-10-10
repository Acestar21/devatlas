const base = {
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
	"aria-hidden": true,
	width: 14,
	height: 14,
};

export function ArrowIcon() {
	return (
		<svg {...base}>
			<path d="M5 12h14M13 6l6 6-6 6" />
		</svg>
	);
}

export function StarIcon() {
	return (
		<svg {...base} fill="currentColor" strokeWidth={1}>
			<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" />
		</svg>
	);
}

export function ChevronIcon({ dir }: { dir: "left" | "right" | "up" | "down" }) {
	const d = {
		left: "m15 6-6 6 6 6",
		right: "m9 6 6 6-6 6",
		up: "m6 15 6-6 6 6",
		down: "m6 9 6 6 6-6",
	}[dir];
	return (
		<svg {...base}>
			<path d={d} />
		</svg>
	);
}

export function GripIcon() {
	return (
		<svg {...base} fill="currentColor" stroke="none">
			<circle cx="9" cy="6" r="1.6" />
			<circle cx="15" cy="6" r="1.6" />
			<circle cx="9" cy="12" r="1.6" />
			<circle cx="15" cy="12" r="1.6" />
			<circle cx="9" cy="18" r="1.6" />
			<circle cx="15" cy="18" r="1.6" />
		</svg>
	);
}
