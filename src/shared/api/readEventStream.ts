import { ApiError } from "./ApiError";

export async function readEventStream(
	response: Response,
	assertActive: () => void,
) {
	if (
		!response.body ||
		!response.headers.get("Content-Type")?.startsWith("text/event-stream")
	) {
		await response.body?.cancel();
		throw new ApiError(
			"Сервер не вернул поток событий",
			502,
			"INVALID_RESPONSE",
		);
	}

	const reader = response.body.getReader();
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			try {
				assertActive();
				const result = await reader.read();
				assertActive();
				if (result.done) {
					reader.releaseLock();
					controller.close();
				} else controller.enqueue(result.value);
			} catch (error) {
				await reader.cancel().catch(() => undefined);
				controller.error(error);
			}
		},
		async cancel(reason) {
			await reader.cancel(reason);
		},
	});
}
