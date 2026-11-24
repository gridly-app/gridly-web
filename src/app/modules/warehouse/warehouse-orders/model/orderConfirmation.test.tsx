import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { CommandExecutor, Order } from "@/domain/warehouse";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { useOrderDetail } from "./useOrderDetail";
import { useOrdersPage } from "./useOrdersPage";

test("a generic confirmation replaces only its directional alias", () => {
	const snapshot = warehouse();
	const order: Order = {
		id: "o",
		number: "O",
		kind: "outbound",
		party: "Получатель",
		created: "2026-11-19T00:00:00Z",
		status: "waiting",
		lines: [],
		manual: snapshot.policy,
		revision: 5,
		allowedActions: ["confirm", "confirm-load", "abort"],
	};
	const calls: unknown[] = [];
	const command: CommandExecutor = async (action, ...args) => {
		calls.push([action, ...args]);
	};
	let confirm: (() => Promise<unknown>) | undefined;
	let actions: string[] = [];

	function Card() {
		const model = useOrderDetail({
			o: order,
			w: snapshot,
			pending: false,
			command,
		});

		confirm = model.confirmOrder;
		actions = model.visibleActions.map((action) => action.id);

		return null;
	}

	renderToStaticMarkup(<Card />);

	expect(actions).toEqual(["abort"]);
	expect(confirm).toBeDefined();
	void confirm?.();
	expect(calls).toEqual([
		["orderAction", { id: "o", action: "confirm", revision: 5 }],
	]);
});

test("table confirmation retains the displayed revision even after the snapshot changes", async () => {
	const snapshot = warehouse();
	const calls: unknown[] = [];
	const command: CommandExecutor = async (action, ...args) => {
		calls.push([action, ...args]);
	};
	let model: ReturnType<typeof useOrdersPage> | undefined;

	function Table() {
		model = useOrdersPage({ kind: "outbound", warehouse: snapshot, command });

		return null;
	}

	renderToStaticMarkup(
		<MemoryRouter>
			<Table />
		</MemoryRouter>,
	);

	const displayed: Order = {
		id: "o",
		number: "O",
		kind: "outbound",
		party: "Получатель",
		created: "2026-11-19T00:00:00Z",
		status: "waiting",
		lines: [],
		manual: snapshot.policy,
		revision: 3,
	};
	snapshot.orders.push({ ...displayed, revision: 7 });

	await model?.confirmOrder(displayed);

	expect(calls).toEqual([
		["orderAction", { id: "o", action: "confirm", revision: 3 }],
	]);
});

test("missing-price filtering checks the selected category rather than other lines of the order", () => {
	const snapshot = warehouse();
	const product = snapshot.products[0]!;
	const order: Order = {
		id: "o",
		number: "O",
		kind: "outbound",
		party: "Получатель",
		created: "2026-11-19T00:00:00Z",
		status: "draft",
		lines: [],
		manual: snapshot.policy,
	};
	snapshot.products = [
		{ ...product, id: "zero", category: "selected", price: "0" },
		{ ...product, id: "missing", category: "selected", price: "" },
		{ ...product, id: "elsewhere", category: "other", price: "" },
	];
	snapshot.orders = [
		{
			...order,
			id: "unpriced-elsewhere",
			lines: [
				{ product: "zero", quantity: 1, expires: "" },
				{ product: "elsewhere", quantity: 1, expires: "" },
			],
		},
		{
			...order,
			id: "unpriced-selected",
			lines: [{ product: "missing", quantity: 1, expires: "" }],
		},
	];
	let ids: string[] = [];

	function Table() {
		const model = useOrdersPage({
			kind: "outbound",
			warehouse: snapshot,
			command: async () => undefined,
		});

		ids = model.visibleOrders.map((item) => item.id);

		return null;
	}

	renderToStaticMarkup(
		<MemoryRouter initialEntries={["/?category=selected&price=missing"]}>
			<Table />
		</MemoryRouter>,
	);

	expect(ids).toEqual(["unpriced-selected"]);
});
