import { expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react/pure";
import type { ReactNode } from "react";

import type { CommandExecutor, Warehouse } from "@/domain/warehouse";
import { type WarehouseData, WarehouseDataProvider } from "@/ports/warehouse";
import { UserError } from "@/shared/lib";
import { registerTestDom } from "../../../../../tests/support/dom";
import { warehouse as warehouseFixture } from "../../../../../tests/support/warehouse";
import { warehouseData } from "../../warehouse-data/model/warehouseData";
import { useNameSettings } from "./useNameSettings";
import { usePolicySettings } from "./usePolicySettings";

function settingsWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
	return {
		...warehouseFixture(),
		name: "Центральный",
		revision: 4,
		policyRevision: 7,
		...overrides,
	};
}

async function withSettings<Result>(
	useSettings: (options: {
		warehouse: Warehouse;
		execute: CommandExecutor;
		pending: boolean;
	}) => Result,
	initial: Warehouse,
	run: (fixture: {
		result: { current: Result };
		calls: unknown[][];
		rerender: (warehouse: Warehouse) => void;
		setSnapshot: (warehouse: Warehouse) => void;
		failNextSave: (error: Error) => void;
	}) => Promise<void>,
) {
	const unregister = registerTestDom();
	const calls: unknown[][] = [];
	let snapshot: Warehouse | undefined;
	let failure: Error | undefined;
	const execute = (async (...args: unknown[]) => {
		calls.push(args);

		if (failure) {
			const error = failure;

			failure = undefined;
			throw error;
		}
	}) as CommandExecutor;
	const data: WarehouseData = {
		...warehouseData,
		useWarehouseCache: () => ({
			getSnapshot: () => snapshot,
			getWarehouses: () => undefined,
			hasReadError: () => false,
		}),
	};

	function wrapper({ children }: { children: ReactNode }) {
		return (
			<WarehouseDataProvider value={data}>{children}</WarehouseDataProvider>
		);
	}

	const hook = renderHook(
		({ warehouse }: { warehouse: Warehouse }) =>
			useSettings({ warehouse, execute, pending: false }),
		{ wrapper, initialProps: { warehouse: initial } },
	);

	try {
		await run({
			result: hook.result,
			calls,
			rerender: (warehouse) => hook.rerender({ warehouse }),
			setSnapshot: (warehouse) => {
				snapshot = warehouse;
			},
			failNextSave: (error) => {
				failure = error;
			},
		});
	} finally {
		hook.unmount();
		await unregister();
	}
}

test("a renamed warehouse is saved with the trimmed name and the current revision", async () => {
	await withSettings(useNameSettings, settingsWarehouse(), async (fixture) => {
		act(() => fixture.result.current.changeName("  Северный  "));
		await act(() => fixture.result.current.save());

		expect(fixture.calls).toEqual([
			["settings", { section: "name", name: "Северный", revision: 4 }],
		]);
		expect(fixture.result.current.message).toEqual({
			text: "Сохранено",
			tone: "success",
		});
	});
});

test("a name changed on the server meanwhile is saved against the draft's revision", async () => {
	await withSettings(useNameSettings, settingsWarehouse(), async (fixture) => {
		act(() => fixture.result.current.changeName("Северный"));
		fixture.rerender(settingsWarehouse({ name: "Южный", revision: 5 }));
		await act(() => fixture.result.current.save());

		expect(fixture.calls).toEqual([
			["settings", { section: "name", name: "Северный", revision: 4 }],
		]);
	});
});

test("after a save the next rename uses the revision the server returned", async () => {
	await withSettings(useNameSettings, settingsWarehouse(), async (fixture) => {
		fixture.setSnapshot(settingsWarehouse({ name: "Северный", revision: 5 }));
		act(() => fixture.result.current.changeName("Северный"));
		await act(() => fixture.result.current.save());
		fixture.rerender(settingsWarehouse({ name: "Северный", revision: 5 }));
		act(() => fixture.result.current.changeName("Восточный"));
		await act(() => fixture.result.current.save());

		expect(fixture.calls.at(-1)).toEqual([
			"settings",
			{ section: "name", name: "Восточный", revision: 5 },
		]);
	});
});

test("a failed rename shows the error and keeps the draft", async () => {
	await withSettings(useNameSettings, settingsWarehouse(), async (fixture) => {
		fixture.failNextSave(new UserError("Название занято"));
		act(() => fixture.result.current.changeName("Северный"));
		await act(() => fixture.result.current.save());

		expect(fixture.result.current.message).toEqual({
			text: "Название занято",
			tone: "error",
		});
		expect(fixture.result.current.name).toBe("Северный");
	});
});

test("confirmations are compared by key and saved with the policy revision", async () => {
	await withSettings(
		usePolicySettings,
		settingsWarehouse(),
		async (fixture) => {
			act(() => fixture.result.current.updatePolicy("confirmPick", true));

			expect(fixture.result.current.isChanged).toBe(true);

			act(() => fixture.result.current.updatePolicy("confirmPick", false));

			expect(fixture.result.current.isChanged).toBe(false);

			act(() => fixture.result.current.updatePolicy("confirmLoad", true));
			await act(() => fixture.result.current.save());

			expect(fixture.calls).toEqual([
				[
					"settings",
					{
						section: "policy",
						policy: {
							confirmUnload: false,
							confirmPick: false,
							confirmPutaway: false,
							confirmLoad: true,
						},
						policyRevision: 7,
					},
				],
			]);
		},
	);
});

test("refreshing confirmations restores the saved values", async () => {
	await withSettings(
		usePolicySettings,
		settingsWarehouse(),
		async (fixture) => {
			act(() => fixture.result.current.updatePolicy("confirmUnload", true));
			act(() => fixture.result.current.refresh());

			expect(
				fixture.result.current.confirmations.map(({ key, checked }) => [
					key,
					checked,
				]),
			).toEqual([
				["confirmUnload", false],
				["confirmPick", false],
				["confirmPutaway", false],
				["confirmLoad", false],
			]);
		},
	);
});
