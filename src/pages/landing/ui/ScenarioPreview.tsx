import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { useInView, useReducedMotion } from "motion/react";
import { useId, useRef } from "react";
import type { LandingScenario } from "../config/landingScenarios";
import styles from "./LandingPage.module.css";

const cells = Array.from({ length: 48 }, (_, id) => ({
	id,
	shelf:
		[1, 2, 3, 4].includes(id % 8) && [1, 2, 4, 5].includes(Math.floor(id / 8)),
}));

export function ScenarioMap({ scenario }: { scenario: LandingScenario }) {
	const reduced = useReducedMotion();
	const grid = useRef<HTMLDivElement>(null);
	const revealed = useInView(grid, { once: true, amount: 0.45 });
	const flowClipId = useId();
	const flowClip =
		"M 0 0 H 794 V 594 H 0 Z " +
		cells
			.filter((cell) => cell.shelf)
			.map(({ id }) => {
				const x = (id % 8) * 100;
				const y =
					Math.floor(id / 8) * 100 -
					(scenario.activeCells.includes(id) ? 6 : 0);
				return `M ${x} ${y} h 94 v 94 h -94 Z`;
			})
			.join(" ");
	const points = (scenario.routeCells ?? []).map((id) => ({
		x: (id % 8) * 100 + 47,
		y: Math.floor(id / 8) * 100 + 47,
	}));
	const approach = scenario.id === "inbound" ? points.at(-1) : points[0];
	if (approach && scenario.routeShelfCell !== undefined) {
		const shelfX = (scenario.routeShelfCell % 8) * 100 + 47;
		const shelfY = Math.floor(scenario.routeShelfCell / 8) * 100 + 47;
		const dx = Math.sign(approach.x - shelfX);
		const dy = Math.sign(approach.y - shelfY);
		const edge = { x: shelfX + dx * 53, y: shelfY - 6 + dy * 53 };
		if (scenario.id === "inbound") points.push(edge);
		else points.unshift(edge);
	}

	const path = points
		.map((point, index) => {
			const previous = points[index - 1];
			const next = points[index + 1];
			if (!previous) return `M ${point.x} ${point.y}`;
			if (!next) return `L ${point.x} ${point.y}`;
			const incoming = Math.hypot(point.x - previous.x, point.y - previous.y);
			const outgoing = Math.hypot(next.x - point.x, next.y - point.y);
			const radius = Math.min(14, incoming / 2, outgoing / 2);
			if (!incoming || !outgoing) return `L ${point.x} ${point.y}`;
			return `L ${point.x - ((point.x - previous.x) / incoming) * radius} ${point.y - ((point.y - previous.y) / incoming) * radius} Q ${point.x} ${point.y} ${point.x + ((next.x - point.x) / outgoing) * radius} ${point.y + ((next.y - point.y) / outgoing) * radius}`;
		})
		.join(" ");
	return (
		<div
			className={styles.scenarioMap}
			aria-hidden="true"
			data-scenario-map={scenario.id}
		>
			<div
				ref={grid}
				className={styles.scenarioGrid}
				data-revealed={revealed || !!reduced}
			>
				{cells.map(({ id, shelf }) => (
					<span
						key={id}
						data-active={scenario.activeCells.includes(id)}
						className={`${styles.scenarioCell} ${shelf ? styles.scenarioShelf : ""}`}
					/>
				))}
				{scenario.id !== "storage" && (
					<svg
						key={scenario.id}
						className={styles.scenarioFlow}
						viewBox="0 0 794 594"
						fill="none"
						data-direction={scenario.id}
						role="img"
						aria-label={
							scenario.id === "inbound" ? "Маршрут приёмки" : "Маршрут отгрузки"
						}
					>
						<desc>
							{scenario.id === "inbound"
								? "Маршрут приёмки"
								: "Маршрут отгрузки"}
						</desc>
						<defs>
							<clipPath id={flowClipId}>
								<path d={flowClip} clipRule="evenodd" fillRule="evenodd" />
							</clipPath>
						</defs>
						<g clipPath={`url(#${flowClipId})`}>
							<path d={path} className={styles.flowTrack} />
							{!reduced &&
								[0, 1, 2, 3].map((index) => (
									<path
										key={index}
										d="M -7 -5 L 0 0 L -7 5"
										stroke="white"
										strokeWidth="3.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<animateMotion
											dur="4s"
											begin={`${-index}s`}
											repeatCount="indefinite"
											rotate="auto"
											path={path}
										/>
									</path>
								))}
						</g>
					</svg>
				)}
			</div>
		</div>
	);
}

export interface ScenarioPreviewProps {
	scenario: LandingScenario;
}
export function ScenarioPreview({ scenario }: ScenarioPreviewProps) {
	return (
		<section
			className={styles.scenarioPreview}
			aria-label="Иллюстрация складского сценария"
		>
			<div className={styles.scenarioPreviewHeading}>
				<span>Центральный склад</span>
				<span className={styles.previewStatus}>Пример сценария</span>
			</div>
			<ScenarioMap scenario={scenario} />
			<div className={styles.scenarioLocation}>
				<IconArrowRight size={16} />
				<span>{scenario.location}</span>
			</div>
			<div className={styles.scenarioSteps}>
				{scenario.steps.map((step) => (
					<div key={step}>
						<IconCheck size={16} />
						<span>{step}</span>
					</div>
				))}
			</div>
		</section>
	);
}
