import { ArrowIcon, StarIcon } from "./icons";
import styles from "./ProjectCard.module.css";

export interface ProjectCardProps {
	title: string;
	description: string;
	link: string;
	/** Banner from <repo>/devatlas/banner.* — null/undefined means "no image", which renders the shorter solid banner. */
	imgSrc?: string | null;
	linkText?: string;
	stars?: number;
	className?: string;
}

/**
 * Pinned-repo card (CSS-modules port of the supplied project-card prompt).
 * - With a banner image: tall 16:9 banner.
 * - Without one: shorter solid-colour banner (the "fallback").
 * - Always stretches to the height of its grid cell and pins the link to the
 *   bottom, so neighbouring cards line up regardless of description length.
 */
export default function ProjectCard({
	title,
	description,
	link,
	imgSrc,
	linkText = "View project",
	stars,
	className = "",
}: ProjectCardProps) {
	return (
		<article className={`${styles.card} ${className}`}>
			<div className={imgSrc ? styles.banner : `${styles.banner} ${styles.solid}`}>
				{imgSrc ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={imgSrc} alt="" loading="lazy" className={styles.image} />
				) : (
					<span className={styles.initial} aria-hidden="true">
						{title.slice(0, 1).toUpperCase()}
					</span>
				)}
			</div>
			<div className={styles.body}>
				<div className={styles.titleRow}>
					<h3 className={styles.title}>{title}</h3>
					{typeof stars === "number" && (
						<span className={styles.stars} title={`${stars} stars`}>
							<StarIcon />
							{stars}
						</span>
					)}
				</div>
				<p className={styles.description}>{description || "No description"}</p>
				<a href={link} target="_blank" rel="noreferrer" className={styles.cta}>
					{linkText}
					<ArrowIcon />
				</a>
			</div>
		</article>
	);
}
