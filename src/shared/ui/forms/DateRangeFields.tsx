import { Input } from "../spaceui/input";
import { Field } from "./Field";

interface DateRangeFieldsProps {
	from: string;
	to: string;
	onFromChange: (value: string) => void;
	onToChange: (value: string) => void;
}

export function DateRangeFields({
	from,
	to,
	onFromChange,
	onToChange,
}: DateRangeFieldsProps) {
	return (
		<>
			<Field label="С">
				<Input
					type="date"
					value={from}
					onChange={(event) => onFromChange(event.target.value)}
				/>
			</Field>
			<Field label="По">
				<Input
					type="date"
					value={to}
					onChange={(event) => onToChange(event.target.value)}
				/>
			</Field>
		</>
	);
}
