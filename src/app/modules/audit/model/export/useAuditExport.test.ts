import { expect, spyOn, test } from "bun:test";
import { act, createElement } from "react";

import { mountDom } from "../../../../../../tests/support/dom";
import { WarehouseDataProvider, type WarehouseData } from "@/ports/warehouse";
import { ApiError, type FileHttpClient } from "@/shared/http";

import { useAuditExport } from "./useAuditExport";
import { warehouseData } from "../../../warehouse-data/model/warehouseData";

function mountExport(requestFile: FileHttpClient["requestFile"]) {
	const { root, close } = mountDom();
	const downloads: string[] = [];
	const createUrl = spyOn(URL, "createObjectURL").mockReturnValue(
		"blob:audit-export",
	);
	const click = spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
		function (this: HTMLAnchorElement) {
			downloads.push(this.download);
		},
	);
	const http = { requestFile };
	let current: ReturnType<typeof useAuditExport> | undefined;

	function Export({ filters }: { filters: string }) {
		current = useAuditExport(
			http,
			{ path: "/sandbox/admin/shipment-audit", mode: "sandbox" },
			filters,
			true,
		);

		return null;
	}

	function render(filters: string) {
		const value: WarehouseData = {
			...warehouseData,
			useScopeId: () => "sandbox-1",
		};
		const children = createElement(Export, { filters });

		act(() =>
			root.render(createElement(WarehouseDataProvider, { value, children })),
		);
	}

	function read() {
		if (!current) throw new Error("Audit export did not render");

		return current;
	}

	async function dispose() {
		createUrl.mockRestore();
		click.mockRestore();
		await close();
	}

	return { render, read, downloads, close: dispose };
}

function csvResponse() {
	return new Response("id,event\n1,created", {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition":
				"attachment; filename*=UTF-8''%D0%90%D1%83%D0%B4%D0%B8%D1%82.csv",
		},
	});
}

test("server export sends the same filters, deduplicates clicks and saves the server filename", async () => {
	const response = Promise.withResolvers<Response>();
	const requests: string[] = [];
	const exporter = mountExport((path) => {
		requests.push(path);

		return response.promise;
	});

	try {
		exporter.render("q=test&result=success");

		await act(async () => {
			const first = exporter.read().handleExport();
			const second = exporter.read().handleExport();

			response.resolve(csvResponse());
			await Promise.all([first, second]);
		});

		expect(requests).toEqual([
			"/sandbox/admin/shipment-audit/export?q=test&result=success",
		]);
		expect(exporter.downloads).toEqual(["Аудит.csv"]);
	} finally {
		await exporter.close();
	}
});

test("export rejects unexpected files and server permission errors", async () => {
	let tries = 0;
	const exporter = mountExport(async () => {
		if (tries++ === 0) {
			return new Response("<html>", {
				headers: { "Content-Type": "text/csv-invalid" },
			});
		}

		throw new ApiError("Forbidden", 403, "FORBIDDEN");
	});

	try {
		exporter.render("");
		await act(async () => {
			await exporter.read().handleExport();
		});
		expect(exporter.read().exportError?.message).toContain(
			"Не удалось скачать",
		);
		await act(async () => {
			await exporter.read().handleExport();
		});
		expect(exporter.read().exportError?.message).toContain("нет доступа");
		expect(exporter.downloads).toEqual([]);
	} finally {
		await exporter.close();
	}
});

test("a changed filter aborts the old export and discards its late result", async () => {
	const response = Promise.withResolvers<Response>();
	let signal: AbortSignal | undefined;
	const exporter = mountExport((_path, options) => {
		signal = options?.signal;

		return response.promise;
	});

	try {
		exporter.render("q=old");
		let exporting: Promise<void> | undefined;

		act(() => {
			exporting = exporter.read().handleExport();
		});
		exporter.render("q=new");
		expect(signal?.aborted).toBe(true);

		await act(async () => {
			response.resolve(csvResponse());
			await exporting;
		});

		expect(exporter.downloads).toEqual([]);
	} finally {
		await exporter.close();
	}
});
