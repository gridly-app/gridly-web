import { Button } from "@/shared/ui/controls";
import chartStyles from "../ReportChart.module.css";
import styles from "./Donut.module.css";

interface Slice {
	key: string;
	label: string;
	value: number;
	color: string;
}
export function Donut({
	slices,
	selected,
	onSelect,
	title,
	center,
	caption,
}: {
	slices: Slice[];
	selected: string;
	onSelect: (key: string) => void;
	title: string;
	center: number;
	caption: string;
}) {
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	const circumference = 2 * Math.PI * 72;
	let accumulated = 0;
	return (
		<div className={styles.distribution}>
			<svg
				viewBox="0 0 200 200"
				role="application"
				aria-label={title}
				className={styles.donut}
			>
				<desc>{title}</desc>
				<circle
					cx="100"
					cy="100"
					r="72"
					fill="none"
					stroke="var(--muted)"
					strokeWidth="22"
				/>
				{slices
					.filter((slice) => slice.value > 0)
					.map((slice) => {
						const length = total ? (slice.value / total) * circumference : 0;
						const offset = accumulated;
						accumulated += length;
						return (
							<Button
								render={<g />}
								variant="ghost"
								tooltip={`${slice.label}: ${slice.value.toLocaleString("ru-RU")}`}
								key={slice.key}
								role="button"
								tabIndex={0}
								className={styles.donutSlice}
								aria-label={`${slice.label}: ${slice.value}. Выбрать.`}
								onClick={() => onSelect(slice.key)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onSelect(slice.key);
									}
								}}
							>
								<circle
									cx="100"
									cy="100"
									r="72"
									fill="none"
									stroke={slice.color}
									strokeWidth={selected === slice.key ? 27 : 22}
									strokeDasharray={`${Math.max(0, length - (length < circumference ? 3 : 0))} ${circumference}`}
									strokeDashoffset={-offset}
									transform="rotate(-90 100 100)"
									opacity={
										selected === "all" || selected === slice.key ? 1 : 0.25
									}
								/>
							</Button>
						);
					})}
				<text x="100" y="99" textAnchor="middle" className={styles.donutValue}>
					{center.toLocaleString("ru-RU")}
				</text>
				<text
					x="100"
					y="122"
					textAnchor="middle"
					className={styles.donutCaption}
				>
					{caption}
				</text>
			</svg>
			<div className={styles.distributionLegend}>
				{slices.map((slice) => (
					<Button
						key={slice.key}
						variant="ghost"
						size="sm"
						selected={selected === slice.key}
						onClick={() => onSelect(slice.key)}
						className={styles.distributionItem}
					>
						<span
							className={chartStyles.dot}
							style={{ background: slice.color }}
						/>
						<span className={styles.sliceLabel}>{slice.label}</span>
						<strong>{slice.value.toLocaleString("ru-RU")}</strong>
					</Button>
				))}
			</div>
		</div>
	);
}
