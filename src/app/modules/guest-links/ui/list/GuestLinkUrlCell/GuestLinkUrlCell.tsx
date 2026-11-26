import { IconCopy } from "@tabler/icons-react";

import { IconButton } from "@/shared/ui/controls";

import type { GuestLink } from "../../../api/guestLink.dto";
import { compactGuestUrl } from "../../../model/list/compactGuestUrl";

import styles from "./GuestLinkUrlCell.module.css";

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
