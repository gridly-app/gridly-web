import { useId } from "react";

import {
	type GuestSection,
	guestSections,
	guestSectionSchema,
} from "@/domain/shipment";
import { Checkbox } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { managementStyles as styles } from "@/shared/ui/management";

export function GuestLinkSectionPicker({
	sections,
	disabled,
	error,
	onCheck,
}: {
	sections: GuestSection[];
	disabled: boolean;
	error: string;
	onCheck: (section: GuestSection, checked: boolean) => void;
}) {
	const fieldId = useId();

	return (
		<fieldset className={styles.fieldset}>
			<legend className={styles.legend}>Доступные разделы</legend>
			{guestSectionSchema.options.map((section) => {
				const id = `${fieldId}-section-${section}`;
				const handleCheck = (checked: boolean) => onCheck(section, checked);

				return (
					<label key={section} className={styles.checkRow} htmlFor={id}>
						<Checkbox
							id={id}
							disabled={disabled}
							checked={sections.includes(section)}
							onCheckedChange={handleCheck}
						/>
						{guestSections[section]}
					</label>
				);
			})}
			{error && <Feedback tone="error">{error}</Feedback>}
		</fieldset>
	);
}
