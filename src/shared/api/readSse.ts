export interface ServerEvent {
	event: string;
	data: string;
	id: string;
}

/** Incremental SSE decoding: UTF-8, CR/LF, comments, multi-line data. */
export async function readSse(
	stream: ReadableStream<Uint8Array>,
	onEvent: (event: ServerEvent) => Promise<void>,
	onActivity: () => void,
	signal: AbortSignal,
) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "",
		event = "message",
		id = "",
		data: string[] = [];
	let skipLF = false;
	let dataLength = 0;
	const abort = () => {
		void reader.cancel().catch(() => undefined);
	};
	signal.addEventListener("abort", abort, { once: true });
	async function line(value: string) {
		if (!value) {
			if (data.length) await onEvent({ event, id, data: data.join("\n") });
			event = "message";
			id = "";
			data = [];
			dataLength = 0;
			return;
		}
		if (value.startsWith(":")) return;
		const colon = value.indexOf(":");
		const field = colon < 0 ? value : value.slice(0, colon);
		const raw = colon < 0 ? "" : value.slice(colon + 1);
		const content = raw.startsWith(" ") ? raw.slice(1) : raw;
		if (field === "event") event = content;
		if (field === "id" && !content.includes("\0")) id = content;
		if (field === "data") {
			data.push(content);
			dataLength += content.length;
		}
	}
	try {
		while (!signal.aborted) {
			const chunk = await reader.read();
			signal.throwIfAborted();
			if (chunk.done) break;
			onActivity();
			const text = decoder.decode(chunk.value, { stream: true });
			for (const char of text) {
				if (skipLF && char === "\n") {
					skipLF = false;
					continue;
				}
				skipLF = false;
				if (char === "\r" || char === "\n") {
					await line(buffer);
					buffer = "";
					skipLF = char === "\r";
				} else buffer += char;
				if (buffer.length + dataLength > 1024 * 1024)
					throw new Error("Событие SSE превышает допустимый размер");
			}
		}
	} finally {
		signal.removeEventListener("abort", abort);
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
}
