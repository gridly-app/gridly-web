import { IconSearch } from "@tabler/icons-react";
import type { ChangeEvent } from "react";
import { useId } from "react";
import { Input } from "../controls/Input";
import searchStyles from "./SearchField.module.css";

export interface SearchFieldProps {
	value: string;
	onChange: (value: string) => void;
	"aria-label"?: string | undefined;
}

export function SearchField({
	value,
	onChange,
	"aria-label": label = "Поиск",
}: SearchFieldProps) {
	const controlId = useId();
	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onChange(event.target.value);
	}

	return (
		<label className={searchStyles.search} htmlFor={controlId}>
			<IconSearch size={17} />
			<Input
				className={searchStyles.input}
				id={controlId}
				aria-label={label}
				placeholder="Поиск…"
				value={value}
				onChange={handleChange}
			/>
		</label>
	);
}
