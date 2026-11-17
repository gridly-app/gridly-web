import { clsx } from "clsx";
import { useInView } from "motion/react";
import { useId, useRef } from "react";

import { useMediaQuery } from "@/shared/lib";

import {
	type LandingScenario,
	landingScenarios,
	type LandingScenarioId,
} from "../../config/landingScenarios";
import { routeGeometry } from "../../model/scenarioMapGeometry";
import { cells, gridStyle, viewBox } from "../../model/scenarioMapGrid";

import styles from "./ScenarioMap.module.css";

const revealThreshold = 0.45;
const arrowOffsets = [0, -1, -2, -3];

export function ScenarioMap({ scenarioId }: { scenarioId: LandingScenarioId }) {
	const scenario: LandingScenario = landingScenarios[scenarioId];
	const { activeCells } = scenario;
	const shouldReduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
	const grid = useRef<HTMLDivElement>(null);
	const isInView = useInView(grid, { once: true, amount: revealThreshold });
	const isRevealed = isInView || shouldReduceMotion;
	const flowClipId = useId();
	const clipPath = `url(#${flowClipId})`;
	const route = routeGeometry(scenario.route, activeCells);
	const visibleArrowOffsets = shouldReduceMotion ? [] : arrowOffsets;

	return (
		<div
			className={styles.scenarioMap}
			aria-hidden="true"
			data-scenario-map={scenarioId}
		>
			<div
				ref={grid}
				className={styles.scenarioGrid}
				data-revealed={isRevealed}
				style={gridStyle}
			>
				{cells.map(({ id, isShelf }) => (
					<span
						key={id}
						data-active={activeCells.includes(id)}
						className={clsx(
							styles.scenarioCell,
							isShelf && styles.scenarioShelf,
						)}
					/>
				))}
				{route && (
					<svg
						key={scenarioId}
						className={styles.scenarioFlow}
						viewBox={viewBox}
						fill="none"
						data-shelf-endpoint={route.shelfEndpoint}
					>
						<defs>
							<clipPath id={flowClipId}>
								<path d={route.clip} clipRule="evenodd" fillRule="evenodd" />
							</clipPath>
						</defs>
						<g clipPath={clipPath}>
							<path d={route.path} className={styles.flowTrack} />
							{visibleArrowOffsets.map((offset) => (
								<path
									key={offset}
									d="M -7 -5 L 0 0 L -7 5"
									stroke="white"
									strokeWidth="3.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<animateMotion
										dur="4s"
										begin={`${offset}s`}
										repeatCount="indefinite"
										rotate="auto"
										path={route.path}
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
