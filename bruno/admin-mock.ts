import { z } from "zod";

import { guestSectionSchema } from "../src/domain/shipment";

import { createGuestLinksMock } from "./guest-links-mock";
import {
	base,
	invalidJson,
	notFound,
	privateHeaders,
	problem,
	readMutation,
	type MockStore,
} from "./mock-http";
import { handleMonitoring } from "./monitoring-mock";
import { mockShipmentDocument } from "./shipment-document-mock";
import { handleUsers } from "./users-mock";
import { shipmentFor } from "./working-shipment-mock";

export type { MockStore } from "./mock-http";

export function createAdminMock({ seedLinks = false } = {}) {
	const {
		handlePublicShipment,
		handleAdminLinks,
		issueLink,
		revokeIssuedLink,
		closeSandbox,
	} = createGuestLinksMock(seedLinks);
	const documents = new WeakMap<MockStore, Map<string, File>>();

	async function handle(
		request: Request,
		account: MockStore,
		sandbox?: MockStore,
		publicOrigin?: string,
	): Promise<Response | undefined> {
		const { pathname } = new URL(request.url);
		const bearer = request.headers.get("Authorization");
		const { method } = request;

		if (pathname.startsWith(`${base}/public/shipments`)) {
			return handlePublicShipment(request);
		}

		const workingOrder = pathname.match(
			/^\/api\/v1\/warehouses\/([^/]+)\/orders\/([^/]+)\/shipment$/,
		);
		if (
			seedLinks &&
			workingOrder &&
			method === "GET" &&
			(sandbox || bearer === "Bearer bruno-account-token")
		) {
			const [, warehouse, orderId] = workingOrder;
			const shipment = shipmentFor(
				sandbox ?? account,
				decodeURIComponent(warehouse ?? ""),
				decodeURIComponent(orderId ?? ""),
				true,
			);
			if (shipment) return Response.json(shipment, { headers: privateHeaders });
			return notFound();
		}

		const operator = pathname.match(
			/^\/api\/v1\/warehouses\/([^/]+)\/orders\/([^/]+)\/shipment(\/share-link|\/documents(?:\/[^/]+(?:\/download)?)?)$/,
		);

		if (seedLinks && operator) {
			const [, encodedWarehouse, encodedOrder, suffix] = operator;
			const store = sandbox ?? account;

			if (!sandbox && bearer !== "Bearer bruno-account-token")
				return problem(403, "FORBIDDEN", "Недостаточно прав");

			const warehouse = decodeURIComponent(encodedWarehouse ?? "");
			const orderId = decodeURIComponent(encodedOrder ?? "");
			const shipment = shipmentFor(store, warehouse, orderId);

			if (!shipment || !suffix) return notFound();

			const path = pathname.slice(0, -suffix.length);
			const save = (data: typeof shipment) => store.set(path, data);

			if (suffix.startsWith("/documents")) {
				const files = documents.get(store) ?? new Map<string, File>();

				documents.set(store, files);

				return mockShipmentDocument(request, shipment, suffix, files, save);
			}

			const currentLinkId = shipment.share_link?.id;

			if (method === "DELETE") {
				revokeIssuedLink(currentLinkId);

				save({ ...shipment, share_link: null });

				return new Response(null, { status: 204 });
			}

			if (method === "POST") {
				const expiry = z
					.object({ expires_at: z.iso.datetime({ offset: true }) })
					.safeParse(await request.json());

				if (!expiry.success)
					return problem(
						422,
						"INVALID_SCOPE",
						"Проверьте срок действия ссылки",
					);

				const input = {
					...expiry.data,
					name: shipment.order.recipient,
					order_ids: [orderId],
					sections: [...guestSectionSchema.options],
				};

				return issueLink(
					request,
					store,
					warehouse,
					input,
					"operator",
					publicOrigin,
					({ id, expires_at }) => {
						revokeIssuedLink(currentLinkId);

						save({
							...shipment,
							share_link: { id, expires_at, origin: "operator" },
						});
					},
				);
			}

			return problem(405, "METHOD_NOT_ALLOWED", "Операция недоступна");
		}

		const monitoring = handleMonitoring(request, account, sandbox);

		if (monitoring) return monitoring;

		const admin = pathname.match(
			/^\/api\/v1\/(sandbox\/)?admin\/(?:warehouses\/([^/]+)\/shipment-links(?:\/([^/]+))?|(shipment-users)(?:\/([^/]+)(?:\/warehouses\/([^/]+))?)?)$/,
		);
		if (!admin) return;
		const [
			,
			sandboxPrefix,
			warehouseId,
			linkId,
			users,
			userId,
			membershipWarehouse,
		] = admin;
		const store = sandboxPrefix ? sandbox : account;
		if (!bearer || !store)
			return problem(401, "UNAUTHORIZED", "Войдите в систему");
		if (!sandboxPrefix && bearer !== "Bearer bruno-account-token")
			return problem(403, "FORBIDDEN", "Недостаточно прав");
		const body = await readMutation(request);
		if (body === invalidJson)
			return problem(422, "INVALID_JSON", "Проверьте данные запроса");
		if (users)
			return handleUsers(
				request,
				store,
				sandboxPrefix,
				userId,
				membershipWarehouse,
				body,
			);

		return handleAdminLinks(
			request,
			store,
			warehouseId,
			linkId,
			body,
			publicOrigin,
		);
	}

	return { handle, closeSandbox };
}
