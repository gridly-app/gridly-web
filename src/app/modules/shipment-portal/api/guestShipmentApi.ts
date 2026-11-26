import { type FileHttpClient, parseResponse } from "@/shared/http";

import { type GuestShipments, guestShipmentsSchema } from "./guestShipment.dto";

const requestTimeoutMs = 15_000;

const guestShipmentsPath = "/public/shipments";

export type ReadGuestShipments = (
	token: string,
	signal: AbortSignal,
) => Promise<GuestShipments>;

export type DownloadGuestDocument = (
	token: string,
	id: string,
	signal: AbortSignal,
) => Promise<Response>;

function guestHeaders(token: string) {
	return { Authorization: `Bearer ${token}` };
}

export class GuestShipmentApi {
	constructor(
		private readonly http: Pick<FileHttpClient, "request" | "requestFile">,
	) {}

	readonly read: ReadGuestShipments = async (token, signal) => {
		const response = await this.http.request(guestShipmentsPath, {
			headers: guestHeaders(token),
			privacy: true,
			signal: AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
		});

		return parseResponse(guestShipmentsSchema, response);
	};

	readonly download: DownloadGuestDocument = (token, id, signal) => {
		const documentPath = `${guestShipmentsPath}/documents/${encodeURIComponent(id)}/download`;

		return this.http.requestFile(documentPath, {
			headers: guestHeaders(token),
			signal,
		});
	};
}
