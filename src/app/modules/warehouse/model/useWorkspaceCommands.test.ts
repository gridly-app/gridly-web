import { afterEach, expect, spyOn, test } from "bun:test";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
} from "@tanstack/react-query";
import { act, createElement } from "react";

import type { WarehouseCommand } from "@/domain/warehouse";
import { type MutationReceipt, WarehouseDataProvider } from "@/ports/warehouse";
import { UserError } from "@/shared/lib";
import { toastManager } from "@/shared/ui/feedback";

import { mountDom } from "../../../../../tests/support/dom";
import { warehouseData } from "../../warehouse-data/model/warehouseData";
import { useWorkspaceCommands } from "./useWorkspaceCommands";

const toast = spyOn(toastManager, "add");

afterEach(() => toast.mockClear());

async function mountCommands() {
	const dom = mountDom();
	const failure = new UserError("Склад отклонил запись");
	let commands: ReturnType<typeof useWorkspaceCommands> | undefined;

	function Commands() {
		commands = useWorkspaceCommands("warehouse-1", false);

		return null;
	}

	const data = {
		...warehouseData,
		useWarehouseCommand: () =>
			useMutation<
				MutationReceipt,
				Error,
				WarehouseCommand & { operationId?: string | undefined }
			>({
				mutationFn: () => Promise.reject(failure),
			}),
		useWarehouseCache: () => ({
			getSnapshot: () => undefined,
			getWarehouses: () => undefined,
			hasReadError: () => false,
		}),
	};

	const client = new QueryClient();
	const tree = createElement(WarehouseDataProvider, {
		value: data,
		children: createElement(Commands),
	});

	act(() =>
		dom.root.render(
			createElement(QueryClientProvider, { client, children: tree }),
		),
	);

	if (!commands) throw new Error("Workspace commands did not mount");

	return { dom, commands, failure };
}

test("a failed execute leaves the message to the screen that started it", async () => {
	const { dom, commands, failure } = await mountCommands();

	try {
		await expect(commands.execute("simulation")).rejects.toBe(failure);
		expect(toast).not.toHaveBeenCalled();
	} finally {
		await dom.close();
	}
});

test("a failed command reports the error once because its caller does not show it", async () => {
	const { dom, commands, failure } = await mountCommands();

	try {
		expect(await commands.command("simulation")).toEqual({
			ok: false,
			error: failure,
		});
		expect(toast).toHaveBeenCalledTimes(1);
		expect(toast.mock.calls[0]?.[0]).toMatchObject({
			description: "Склад отклонил запись",
		});
	} finally {
		await dom.close();
	}
});
