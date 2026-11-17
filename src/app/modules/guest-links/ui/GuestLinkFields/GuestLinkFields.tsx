import { Input } from "@/shared/ui/controls";
import { Field } from "@/shared/ui/forms";
import { managementStyles as styles } from "@/shared/ui/management";

import { guestLinkNameMaxLength } from "../../api/guestLink.dto";

export function GuestLinkFields({
	name,
	expires,
	disabled,
	errors,
}: {
	name: string | undefined;
	expires: string;
	disabled: boolean;
	errors: { name: string; expires: string };
}) {
	return (
		<div className={styles.editorColumns}>
			<Field label="Название" error={errors.name}>
				<Input
					name="name"
					required
					disabled={disabled}
					maxLength={guestLinkNameMaxLength}
					defaultValue={name}
				/>
			</Field>
			<Field label="Действует до (UTC)" error={errors.expires}>
				<Input
					name="expires"
					type="datetime-local"
					required
					disabled={disabled}
					defaultValue={expires}
				/>
			</Field>
		</div>
	);
}
