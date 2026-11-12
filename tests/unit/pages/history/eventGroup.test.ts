import { expect, test } from "bun:test";
import { historyEventGroup } from "@/pages/history/model/eventGroup";

test("history recognizes real untyped REST messages without an unexplained Other group", () => {
	expect(
		historyEventGroup({
			title: "Заказ ЗК-2079 собран",
			detail: "6 единиц товара переданы в зону отгрузки",
		}),
	).toBe("order");
	expect(
		historyEventGroup({
			title: "Робот R-03 зарядился",
			detail: "Аккумулятор: 98%",
		}),
	).toBe("robot");
	expect(
		historyEventGroup({
			title: "Склад готов к работе",
			detail: "Загружены данные",
		}),
	).toBe("warehouse");
	expect(historyEventGroup({ title: "Состояние обновлено", detail: "" })).toBe(
		"warehouse",
	);
});
test("explicit event metadata takes precedence over message text", () => {
	expect(
		historyEventGroup({
			type: "task.completed",
			title: "Заказ передан роботу",
			detail: "",
		}),
	).toBe("task");
	expect(
		historyEventGroup({
			entity: "/orders/order-1",
			title: "Состояние обновлено",
			detail: "",
		}),
	).toBe("order");
	expect(
		historyEventGroup({
			type: "inventory.writeoff",
			title: "Списание товара",
			detail: "",
		}),
	).toBe("inventory");
});
