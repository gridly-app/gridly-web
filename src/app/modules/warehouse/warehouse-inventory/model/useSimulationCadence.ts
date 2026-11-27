import { useEffect, useRef, useState } from "react";

import type { Warehouse } from "@/domain/warehouse";

const maxTickIntervalMs = 60_000;
const smoothingWeight = 0.25;

type TickSample = { id: string; tick: number; at: number };

function smoothedCadence(
	current: { id: string; milliseconds: number } | null,
	id: string,
	sample: number,
) {
	if (current?.id !== id) return sample;

	return (
		current.milliseconds * (1 - smoothingWeight) + sample * smoothingWeight
	);
}

export function useSimulationCadence(
	warehouse: Pick<Warehouse, "id" | "tick" | "asOf" | "lastTickAt" | "running">,
) {
	const previous = useRef<TickSample | null>(null);
	const [cadence, setCadence] = useState<{
		id: string;
		milliseconds: number;
	} | null>(null);
	const at = Date.parse(warehouse.asOf ?? warehouse.lastTickAt ?? "");
	const tick = Number(warehouse.tick);
	const { id, running } = warehouse;

	useEffect(() => {
		if (!running || !Number.isFinite(at) || !Number.isSafeInteger(tick)) {
			previous.current = null;
			setCadence(null);

			return;
		}

		const last = previous.current;
		const isSameWarehouse = last?.id === id;
		const isNextTick = isSameWarehouse && tick > last.tick && at > last.at;
		const isReset = last !== null && (!isSameWarehouse || tick < last.tick);

		if (isNextTick) {
			const sample = (at - last.at) / (tick - last.tick);

			if (sample > 0 && sample <= maxTickIntervalMs) {
				setCadence((current) => ({
					id,
					milliseconds: smoothedCadence(current, id, sample),
				}));
			}
		}

		if (isReset) setCadence(null);
		if (!isSameWarehouse || tick !== last.tick)
			previous.current = { id, tick, at };
	}, [id, running, tick, at]);

	return running && cadence?.id === id ? cadence.milliseconds : null;
}
