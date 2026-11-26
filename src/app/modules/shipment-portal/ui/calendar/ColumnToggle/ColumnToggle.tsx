import type { ChangeEvent } from "react";

import type { CalendarField } from "../../../config/calendarColumns";

export function ColumnToggle({
	field,
	label,
	checked,
	onChange,
}: {
	field: CalendarField;
	label: string;
	checked: boolean;
	onChange: (field: CalendarField, checked: boolean) => void;
}) {
	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onChange(field, event.target.checked);
	}

	return (
		<label>
			<input type="checkbox" checked={checked} onChange={handleChange} />{" "}
			{label}
		</label>
	);
}
