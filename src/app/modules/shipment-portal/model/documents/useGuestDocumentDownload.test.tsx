import { expect, spyOn, test } from "bun:test";
import { act } from "react";

import { ApiError } from "@/shared/http";

import { mountDom } from "../../../../../../tests/support/dom";

import type { DownloadGuestDocument } from "../../api/guestShipmentApi";
import { useGuestDocumentDownload } from "./useGuestDocumentDownload";

function mountDownload(downloadFile: DownloadGuestDocument) {
	const dom = mountDom();
	let current: ReturnType<typeof useGuestDocumentDownload> | undefined;
	let refreshes = 0;

	function refresh() {
		refreshes++;
	}

	function Download() {
		current = useGuestDocumentDownload("guest-token", downloadFile, refresh);

		return null;
	}

	act(() => dom.root.render(<Download />));

	function read() {
		if (!current) throw new Error("Document download did not render");

		return current;
	}

	return { ...dom, read, refreshes: () => refreshes };
}

test("document download prevents duplicate requests and saves the response filename", async () => {
	const response = Promise.withResolvers<Response>();
	let requests = 0;
	const model = mountDownload(async () => {
		requests++;

		return response.promise;
	});
	const filenames: string[] = [];
	const createUrl = spyOn(URL, "createObjectURL").mockReturnValue(
		"blob:document",
	);
	const click = spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
		function (this: HTMLAnchorElement) {
			filenames.push(this.download);
		},
	);
	let completion: Promise<void> | undefined;

	try {
		act(() => {
			completion = model.read().download("", "fallback.txt");
		});
		expect(model.read().pendingDocumentId).toBe("");

		await model.read().download("second", "second.txt");

		expect(requests).toBe(1);

		await act(async () => {
			response.resolve(
				new Response("document", {
					headers: {
						"Content-Disposition": 'attachment; filename="invoice.txt"',
					},
				}),
			);
			await completion;
		});

		expect(filenames).toEqual(["invoice.txt"]);
		expect(model.read().pendingDocumentId).toBeNull();
		expect(model.read().error).toBe("");
	} finally {
		createUrl.mockRestore();
		click.mockRestore();
		await model.close();
	}
});

test("denied document access refreshes permissions and releases the download", async () => {
	const model = mountDownload(async () => {
		throw new ApiError("Denied", 403);
	});

	try {
		await act(async () => {
			await model.read().download("document-1", "invoice.txt");
		});

		expect(model.read().error).toBe(
			"Документ больше недоступен по этой ссылке.",
		);
		expect(model.read().pendingDocumentId).toBeNull();
		expect(model.refreshes()).toBe(1);
	} finally {
		await model.close();
	}
});

test("unmount cancels a document request and prevents a late response from being saved", async () => {
	const response = Promise.withResolvers<Response>();
	const signals: AbortSignal[] = [];
	const model = mountDownload((_token, _id, signal) => {
		signals.push(signal);

		return response.promise;
	});
	const createUrl = spyOn(URL, "createObjectURL").mockReturnValue(
		"blob:document",
	);
	let completion: Promise<void> | undefined;

	try {
		act(() => {
			completion = model.read().download("document-1", "invoice.txt");
		});
		await model.close();
		response.resolve(new Response("document"));
		await completion;

		expect(signals[0]?.aborted).toBe(true);
		expect(createUrl).not.toHaveBeenCalled();
	} finally {
		createUrl.mockRestore();
	}
});
