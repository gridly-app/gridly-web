import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";

import { mountDom } from "../../../../../../tests/support/dom";
import { shipment } from "../../../../../../tests/support/shipment";
import type { WorkingShipment } from "./shipment.dto";
import { shipmentDocuments } from "./shipmentDocuments";
import { useShipmentCreation } from "./useShipmentCreation";

async function withDocuments(
	run: (fixture: {
		documents: ReturnType<typeof shipmentDocuments>;
		requests: {
			key: FormDataEntryValue | null;
			published: FormDataEntryValue | null;
		}[];
		saved: WorkingShipment[];
		findUpload: () => void;
	}) => Promise<void>,
) {
	const dom = mountDom();
	const cache = new QueryClient();
	const requests: {
		key: FormDataEntryValue | null;
		published: FormDataEntryValue | null;
	}[] = [];
	const saved: WorkingShipment[] = [];
	let hasUpload = false;
	let model: ReturnType<typeof shipmentDocuments> | undefined;

	function Documents() {
		const creation = useShipmentCreation(
			["test-shipment"],
			null,
			async () => {},
		);
		const snapshot: WorkingShipment = {
			...shipment(),
			documents: [],
			share_link: null,
			allowed_actions: [],
			revision: 1,
		};

		model = shipmentDocuments({
			path: "/test/shipment",
			creation,
			http: {
				requestFile: async () => new Response(),
				request: async (path, options) => {
					expect(path).toBe("/test/shipment/documents");
					expect(options?.method).toBe("POST");

					const body = options?.body;
					if (!(body instanceof FormData))
						throw new Error("Expected multipart upload");

					requests.push({
						key: body.get("upload_request_id"),
						published: body.get("published"),
					});

					if (requests.length === 1)
						throw new TypeError("Lost acknowledgement");

					return {};
				},
			},
			getDocumentCount: () => snapshot.documents.length,
			readShipment: async () => {
				const key = requests[0]?.key;

				if (!hasUpload || typeof key !== "string") return snapshot;

				return {
					...snapshot,
					documents: [
						{
							id: "server-document",
							name: "document.pdf",
							category: "transport",
							uploaded_at: "2026-11-12T00:00:00Z",
							version: 1,
							published: false,
							upload_request_id: key,
						},
					],
				};
			},
			replaceShipment: async (_signal, snapshot) => {
				saved.push(snapshot);
			},
		});

		return null;
	}

	try {
		act(() =>
			dom.root.render(
				createElement(QueryClientProvider, {
					client: cache,
					children: createElement(Documents),
				}),
			),
		);

		if (!model) throw new Error("Document resource did not render");

		await run({
			documents: model,
			requests,
			saved,
			findUpload: () => {
				hasUpload = true;
			},
		});
	} finally {
		await dom.close();
		cache.clear();
	}
}

function documentForm() {
	const body = new FormData();

	body.set("file", new File(["contents"], "document.pdf"));

	return body;
}

test("a lost upload response is reconciled without sending the file twice", async () => {
	await withDocuments(async ({ documents, requests, saved, findUpload }) => {
		findUpload();

		await act(async () =>
			documents.uploadDocument(documentForm(), new AbortController().signal),
		);

		expect(requests).toEqual([{ key: expect.any(String), published: "false" }]);
		expect(saved.at(-1)?.documents[0]?.id).toBe("server-document");
	});
});

test("when an upload is still missing, retry reuses the original request ID", async () => {
	await withDocuments(async ({ documents, requests }) => {
		const signal = new AbortController().signal;

		await act(async () => {
			await expect(
				documents.uploadDocument(documentForm(), signal),
			).rejects.toThrow("Lost acknowledgement");
		});
		await act(async () => documents.retryUpload(signal));

		expect(requests).toHaveLength(2);
		expect(requests[0]?.key).toEqual(expect.any(String));
		expect(requests[1]).toEqual(requests[0]);
	});
});
