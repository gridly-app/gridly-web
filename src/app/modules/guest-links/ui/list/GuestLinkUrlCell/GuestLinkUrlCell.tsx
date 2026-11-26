import { IconCopy } from "@tabler/icons-react";

import { IconButton } from "@/shared/ui/controls";

import type { GuestLink } from "../../../api/guestLink.dto";

import styles from "./GuestLinkUrlCell.module.css";

const tokenSuffixLength = 6;
const compactAddressLength = 24;
const ellipsis = "…";

function compactGuestUrl(value: string) {
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

export function GuestLinkUrlCell({
	link,
	customer,
	onCopy,
}: {
	link: GuestLink;
	customer: string;
	onCopy: (url: string) => void;
}) {
	const { url, status } = link;

	if (!url) return null;

	const address = compactGuestUrl(url);
	const canCopy = status === "active";

	function handleCopy() {
		if (url) onCopy(url);
	}

	return (
		<div className={styles.guestLinkUrl}>
			<span className={styles.guestLinkUrlText} title={url}>
				{address}
			</span>
			{canCopy && (
				<IconButton
					label={`Скопировать ссылку: ${link.name || customer}`}
					icon={<IconCopy aria-hidden="true" />}
					tooltip="Копировать ссылку"
					onClick={handleCopy}
				/>
			)}
		</div>
	);
}
