const tokenSuffixLength = 6;

const compactAddressLength = 24;

const ellipsis = "…";

export function compactGuestUrl(value: string) {
	const url = new URL(value);
	const token = new URLSearchParams(url.hash.slice(1)).get("token");

	if (token) {
		const tokenSuffix = token.slice(-tokenSuffixLength);

		return `${url.host}/${ellipsis}${tokenSuffix}`;
	}

	const address = `${url.host}${url.pathname}`;

	if (address.length <= compactAddressLength) return address;

	const visibleLength = compactAddressLength - ellipsis.length;

	return `${address.slice(0, visibleLength)}${ellipsis}`;
}
