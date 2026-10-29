// A saved form keeps its intent across remounts; edits to its payload start another operation.
export async function mutationIdentity(
	intent: string,
	payload: string,
): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(payload),
	);
	const hash = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	return `${intent}:${hash}`;
}
