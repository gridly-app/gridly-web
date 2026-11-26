export function guestTokenFromHash(hash: string) {
	return new URLSearchParams(hash.slice(1)).get("token") ?? "";
}
