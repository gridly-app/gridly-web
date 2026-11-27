import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { act } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import {
	type LayoutOperation,
	type WarehouseData,
	WarehouseDataProvider,
} from "@/ports/warehouse";
import { WarmTooltipGroup } from "@/shared/ui/overlays";

import { mountDom } from "../../../../../tests/support/dom";
import { warehouse } from "../../../../../tests/support/warehouse";
import {
	CanvasWarehouseRenderer,
	type LayoutRenderState,
} from "./lib/canvas/CanvasWarehouseRenderer";
import { WarehouseMap } from "./WarehouseMap";
import { within } from "@testing-library/react/pure";

function unexpectedRequest(): never {
	throw new Error(
		"WarehouseMap requested a resource outside its data contract",
	);
}

const data: WarehouseData = {
	useScopeId: unexpectedRequest,
	useLayoutOperation: unexpectedRequest,
	useWarehouses: unexpectedRequest,
	useWarehouse: unexpectedRequest,
	useWarehouseConnection: unexpectedRequest,
	useWarehouseLiveSubscription: unexpectedRequest,
	useOrder: unexpectedRequest,
	useWarehouseResources: unexpectedRequest,
	useLiveWarehouseScope: unexpectedRequest,
	useWarehouseCommand: unexpectedRequest,
	useCreateWarehouse: unexpectedRequest,
	useWarehouseCache: unexpectedRequest,
	useRouteProposal: () => useMutation({ mutationFn: unexpectedRequest }),
	useSelectionSummary: (id, keys) =>
		useQuery({
			queryKey: ["selection", id, keys],
			queryFn: unexpectedRequest,
			initialData: { capacity: 0, batchCount: 0 },
			enabled: false,
		}),
};

const aisle = { x: 1, y: 0, type: "aisle" } as const;
const wall = { ...aisle, type: "wall" } as const;

let dom: ReturnType<typeof mountDom>;
let preview: LayoutRenderState | undefined;

beforeEach(() => {
	dom = mountDom();
	preview = undefined;

	spyOn(CanvasWarehouseRenderer.prototype, "drawLayout").mockImplementation(
		(state) => {
			preview = state;
		},
	);
	spyOn(CanvasWarehouseRenderer.prototype, "drawRobots").mockImplementation(
		() => {},
	);
});

afterEach(async () => {
	try {
		await dom.close();
	} finally {
		mock.restore();
	}
});

function renderMap(
	operation: LayoutOperation,
	command: CommandExecutor,
	retryRead = async () => {},
) {
	const snapshot = {
		...warehouse(),
		allowedActions: ["save-map"],
		cells: [aisle],
	};
	const client = new QueryClient();

	act(() => {
		dom.root.render(
			<QueryClientProvider client={client}>
				<WarehouseDataProvider value={data}>
					<WarmTooltipGroup>
						<WarehouseMap
							warehouse={snapshot}
							command={command}
							isPending={false}
							dark={false}
							layout={{
								operation,
								retryRead,
								discardRejected: () => {},
							}}
						/>
					</WarmTooltipGroup>
				</WarehouseDataProvider>
			</QueryClientProvider>,
		);
	});
}

function pressMapKey(key: string) {
	const canvas = document.querySelector("canvas[aria-label]");
	if (!canvas) throw new Error("Warehouse map canvas is missing");

	act(() =>
		canvas.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })),
	);
}

function button(label: string) {
	return within(document.body).getByRole("button", { name: label });
}

function inspectorHeading(name: string) {
	return within(document.body).getByRole("heading", { level: 3, name });
}

const draft: Extract<LayoutOperation["command"], { action: "saveMap" }> = {
	action: "saveMap",
	value: { baseVersion: 1, cells: [aisle], routes: [] },
};

test("editing a recovered draft updates the map preview, inspector and submitted snapshot", async () => {
	const command = mock(async () => undefined);

	renderMap({ status: "rejected", command: draft }, command);
	pressMapKey("ArrowRight");
	expect(inspectorHeading("Проход").textContent).toBe("Проход");
	pressMapKey("Enter");

	act(() => button("Стена").click());

	expect(preview?.cells).toEqual([wall]);
	expect(inspectorHeading("Стена").textContent).toBe("Стена");
	await act(async () => button("Сохранить изменения").click());
	expect(command).toHaveBeenCalledWith(
		"saveMap",
		expect.objectContaining({ baseVersion: 1, cells: [wall] }),
	);
});

test("a version conflict lets the operator compare the published map and return to the draft", () => {
	const command = mock(async () => undefined);
	renderMap(
		{
			status: "conflict",
			command: {
				...draft,
				value: { ...draft.value, baseVersion: 0, cells: [wall] },
			},
		},
		command,
	);

	expect(document.body.textContent).toContain(
		"Сервер отклонил исходную версию",
	);
	expect(button("Сохранить изменения").getAttribute("aria-disabled")).toBe(
		"true",
	);
	expect(preview?.cells).toEqual([wall]);

	act(() => button("Показать сохранённую карту").click());
	expect(preview?.cells).toEqual([aisle]);

	act(() => button("Вернуться к черновику").click());
	expect(preview?.cells).toEqual([wall]);
	expect(command).not.toHaveBeenCalled();
});

test("a confirmed write with a failed refresh offers only a read retry", async () => {
	const command = mock(async () => undefined);
	const retryRead = mock(async () => {});

	renderMap({ status: "refresh-failed", command: draft }, command, retryRead);

	expect(document.body.textContent).toContain(
		"Запись выполнена. Не удалось загрузить актуальную планировку.",
	);
	expect(document.body.textContent).not.toContain("Сохранить изменения");
	await act(async () => button("Повторить").click());

	expect(retryRead).toHaveBeenCalledTimes(1);
	expect(command).not.toHaveBeenCalled();
});
