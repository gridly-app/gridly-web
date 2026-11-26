import { expect, test } from "bun:test";
import { act, createElement } from "react";

import { mountDom } from "../../../../../../tests/support/dom";
import { useSimulationCadence } from "./useSimulationCadence";

test("cadence resets on warehouse changes and backward ticks", async () => {
	const dom = mountDom();
	const observed: { cadence: number | null } = { cadence: null };

	function Cadence({
		id,
		tick,
		asOf,
	}: {
		id: string;
		tick: string;
		asOf: string;
	}) {
		observed.cadence = useSimulationCadence({ id, tick, asOf, running: true });

		return null;
	}

	function update(id: string, tick: string, asOf: string) {
		act(() => dom.root.render(createElement(Cadence, { id, tick, asOf })));
	}

	try {
		update("a", "1", "2026-11-12T10:00:00Z");
		update("a", "3", "2026-11-12T10:00:02Z");

		expect(observed.cadence).toBe(1000);

		update("b", "4", "2026-11-12T10:00:03Z");

		expect(observed.cadence).toBeNull();

		update("b", "6", "2026-11-12T10:00:07Z");

		expect(observed.cadence).toBe(2000);

		update("b", "2", "2026-11-12T10:00:08Z");

		expect(observed.cadence).toBeNull();
	} finally {
		await dom.close();
	}
});
