import { IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "../spaceui/input-group";
export interface SearchFieldProps {
	value: string;
	actions?: ReactNode;
	onChange: (value: string) => void;
	"aria-label"?: string | undefined;
}
export function SearchField({
	value,
	onChange,
	actions,
	"aria-label": label = "Поиск",
}: SearchFieldProps) {
	return (
		<InputGroup className="min-w-40 flex-1">
			<InputGroupAddon>
				<IconSearch aria-hidden="true" />
			</InputGroupAddon>
			<InputGroupInput
				aria-label={label}
				placeholder="Поиск…"
				value={value}
				onChange={(e) => onChange(e.target.value)}
			/>
			{actions && (
				<InputGroupAddon align="inline-end">{actions}</InputGroupAddon>
			)}
		</InputGroup>
	);
}
