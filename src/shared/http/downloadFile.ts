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
	const plain = disposition
		.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i)
		?.slice(1)
		.find(Boolean);
	const name = decodeFilename(encoded) ?? plain;
	const blob = await response.blob();
	signal?.throwIfAborted();
	saveFile(blob, name?.replace(/[/\\\p{Cc}]/gu, "_").trim() || fallback);
}

function decodeFilename(encoded: string | undefined) {
	if (!encoded) return undefined;

	try {
		return decodeURIComponent(encoded);
	} catch (error) {
		if (error instanceof URIError) return undefined;

		throw error;
	}
}
