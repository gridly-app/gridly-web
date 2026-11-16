export function saveFile(blob: Blob, name: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveResponseFile(
	response: Response,
	fallback: string,
	signal?: AbortSignal,
) {
	const disposition = response.headers.get("Content-Disposition") ?? "";
	const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
	let name = disposition
		.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
		?.slice(1)
		.find(Boolean);
	try {
		if (encoded) name = decodeURIComponent(encoded);
	} catch {
		// The plain filename can still be used.
	}
	const blob = await response.blob();
	signal?.throwIfAborted();
	saveFile(blob, name?.replace(/[/\\\p{Cc}]/gu, "_").trim() || fallback);
}
