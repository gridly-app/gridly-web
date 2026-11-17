import type { FocusEvent } from "react";

import { Button, Input } from "@/shared/ui/controls";
import { Field } from "@/shared/ui/forms";

import { managementStyles as styles } from "@/shared/ui/management";

export function IssuedGuestLink({
	url,
	onCopy,
}: {
	url: string;
	onCopy: (url: string) => void;
}) {
	function handleFocus(event: FocusEvent<HTMLInputElement>) {
		event.currentTarget.select();
	}

	function handleCopy() {
		onCopy(url);
	}

	return (
		<div className={styles.form}>
			<Field label="Гостевая ссылка">
				<Input readOnly value={url} onFocus={handleFocus} />
			</Field>
			<div className={styles.actions}>
				<Button variant="secondary" onClick={handleCopy}>
					Копировать ссылку
				</Button>
			</div>
		</div>
	);
}
