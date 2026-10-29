import type { MotionValue } from "motion/react";
import { LazyMotion, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { memo, useRef } from "react";
import { useProximityGrid } from "@/shared/lib";
import proximityStyles from "./ProximityGrid.module.css";

export type ProximityGridProps = {
	className?: string | undefined;
	columns?: number | undefined;
	rows?: number | undefined;
};

export type ProximityCellProps = {
	id: number;
	pointerX: MotionValue<number>;
	pointerY: MotionValue<number>;
	active: MotionValue<number>;
};

const ProximityCell = memo(function ProximityCell({
	id,
	pointerX,
	pointerY,
	active,
}: ProximityCellProps) {
	const anchor = useRef<HTMLSpanElement>(null);
	const influence = useTransform(() => {
		const x = pointerX.get();
		const y = pointerY.get();
		const strength = active.get();
		const rect = anchor.current?.getBoundingClientRect();

		if (!rect || strength <= 0) {
			return 0;
		}
		const radius = rect.width * 2.6;
		const distance = Math.hypot(
			x - rect.left - rect.width / 2,
			y - rect.top - rect.height / 2,
		);
		const proximity = Math.max(0, 1 - distance / radius);

		return proximity * proximity * (3 - 2 * proximity) * strength;
	});
	const smoothInfluence = useSpring(influence, {
		stiffness: 480,
		damping: 36,
		mass: 0.8,
	});
	const y = useTransform(smoothInfluence, [0, 1], [0, -24]);
	const scale = useTransform(smoothInfluence, [0, 1], [1, 1.06]);
	const borderRadius = useTransform(smoothInfluence, [0, 1], [5, 12]);
	const filter = useTransform(
		smoothInfluence,
		[0, 1],
		["brightness(1)", "brightness(1.15)"],
	);
	const boxShadow = useTransform(
		smoothInfluence,
		(value) =>
			`0 ${3 + value * 14}px ${value * 20}px rgba(48,63,128,${value * 0.25})`,
	);

	return (
		<span ref={anchor} className={proximityStyles.proximityCell}>
			<m.i
				className={
					id % 7 === 0
						? proximityStyles.artActive
						: id % 3 === 0
							? proximityStyles.artShelf
							: ""
				}
				style={{ y, scale, borderRadius, filter, boxShadow }}
			/>
		</span>
	);
});

const loadAnimationFeatures = () =>
	import("./motionFeatures").then((module) => module.default);

export function ProximityGrid({
	className = "",
	columns = 8,
	rows = 8,
}: ProximityGridProps) {
	const cells = Array.from({ length: columns * rows }, (_, id) => id);
	const { handlePointerMove, handlePointerLeave, ...pointer } =
		useProximityGrid();

	return (
		<LazyMotion features={loadAnimationFeatures} strict>
			<div
				className={`${proximityStyles.artGrid} ${className}`}
				style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
				aria-hidden="true"
				onPointerMove={handlePointerMove}
				onPointerLeave={handlePointerLeave}
				onPointerCancel={handlePointerLeave}
			>
				{cells.map((id) => (
					<ProximityCell key={id} id={id} {...pointer} />
				))}
			</div>
		</LazyMotion>
	);
}
