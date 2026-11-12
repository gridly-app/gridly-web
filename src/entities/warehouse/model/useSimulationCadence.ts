import { useEffect, useRef, useState } from "react";
import type { Warehouse } from "./warehouse";

export function useSimulationCadence(
	warehouse: Pick<Warehouse, "id" | "tick" | "asOf" | "lastTickAt" | "running">,
) {
	const previous = useRef<{ id: string; tick: number; at: number } | null>(
		null,
	);
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
		if (last?.id === id && tick > last.tick && at > last.at) {
			const sample = (at - last.at) / (tick - last.tick);
			if (sample > 0 && sample <= 60000)
				setCadence((current) => ({
					id,
					milliseconds:
						current?.id === id
							? current.milliseconds * 0.75 + sample * 0.25
							: sample,
				}));
		} else if (last && (last.id !== id || tick < last.tick)) setCadence(null);
		if (!last || last.id !== id || tick !== last.tick)
			previous.current = { id, tick, at };
	}, [id, running, tick, at]);
	return running && cadence?.id === id ? cadence.milliseconds : null;
}
