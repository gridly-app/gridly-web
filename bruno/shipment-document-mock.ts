import { z } from "zod";

import type { WorkingShipment } from "../src/app/modules/warehouse/shipment-management/model/shipment.dto";
import {
	documentAccept,
	documentVersionLimit,
} from "../src/app/modules/warehouse/shipment-management/model/shipmentDocument";
import { documentSchema } from "../src/domain/shipment";

type DocumentRow = WorkingShipment["documents"][number];
const acceptedExtensions = new Set(documentAccept.split(","));
const sizeLimit = 20 * 1024 * 1024;

export async function mockShipmentDocument(
	request: Request,
	shipment: WorkingShipment,
	suffix: string,
	files: Map<string, File>,
	save: (shipment: WorkingShipment) => void,
) {
	const { method } = request;
	const [, , encodedId, action] = suffix.split("/");
	const id = encodedId ? decodeURIComponent(encodedId) : undefined;
	const existing = shipment.documents.find((item) => item.id === id);

	if (method === "GET" && action === "download") {
		if (!existing) return failure(404, "DOCUMENT_NOT_FOUND");

		const file = files.get(existing.id);
		const name = encodeURIComponent(file?.name ?? existing.name);

		return new Response(file ?? existing.name, {
			headers: {
				"Cache-Control": "no-store",
				"Content-Type": file?.type || "application/octet-stream",
				"Content-Disposition": `attachment; filename*=UTF-8''${name}`,
			},
		});
	}

	if (method === "PATCH" && id) {
		if (!existing) return failure(404, "DOCUMENT_NOT_FOUND");

		const body = z
			.object({ published: z.boolean() })
			.safeParse(await request.json());

		if (!body.success) return failure(422, "INVALID_DOCUMENT");

		const updated = { ...existing, published: body.data.published };
		const documents = shipment.documents.map((item) => {
			if (item.id === id) return updated;
			if (updated.published && chainOf(item) === chainOf(updated))
				return { ...item, published: false };

			return item;
		});

		save({ ...shipment, documents });

		return Response.json(updated);
	}

	if (method !== "POST" || id) return failure(405, "METHOD_NOT_ALLOWED");

	const form = await request.formData();
	const metadata = z
		.object({
			name: z.string().trim().min(1),
			category: documentSchema.shape.category,
			upload_request_id: z.uuid(),
		})
		.safeParse(Object.fromEntries(form));

	if (!metadata.success) return failure(422, "INVALID_DOCUMENT");

	const replay = shipment.documents.find(
		(item) => item.upload_request_id === metadata.data.upload_request_id,
	);
	if (replay) return Response.json(replay);
	if (shipment.documents.length >= documentVersionLimit)
		return failure(422, "DOCUMENT_LIMIT_EXCEEDED");

	const file = form.get("file");
	const extension =
		file instanceof File
			? file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
			: undefined;

	if (
		!(file instanceof File) ||
		!extension ||
		!acceptedExtensions.has(extension) ||
		!file.size
	)
		return failure(422, "UNSUPPORTED_FILE_TYPE");
	if (file.size > sizeLimit) return failure(413, "FILE_TOO_LARGE");

	const previousId = form.get("previous_document_id");
	const previous = shipment.documents.find((item) => item.id === previousId);

	if (previousId && previous?.is_latest !== true)
		return failure(409, "STALE_DOCUMENT_VERSION");

	const documentId = crypto.randomUUID();
	const document: DocumentRow = {
		...metadata.data,
		id: documentId,
		chain_id: previous ? chainOf(previous) : documentId,
		version: previous ? previous.version + 1 : 1,
		is_latest: true,
		uploaded_at: new Date().toISOString(),
		published: false,
	};
	const documents = shipment.documents.map((item) =>
		item.id === previous?.id ? { ...item, is_latest: false } : item,
	);

	documents.push(document);
	files.set(documentId, file);
	save({ ...shipment, documents });

	return Response.json(document, { status: 201 });
}

function chainOf(document: DocumentRow) {
	return document.chain_id ?? document.id;
}

function failure(status: number, code: string) {
	return Response.json({ error: { code } }, { status });
}
