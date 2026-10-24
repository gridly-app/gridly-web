import { IconSearch } from "@tabler/icons-react";
import type { ChangeEvent } from "react";
import { useId } from "react";
import { Input } from "../controls/Input";
import searchStyles from "./SearchField.module.css";

export interface SearchFieldProps {
	value: string;
	onChange: (value: string) => void;
}

export function SearchField({ value, onChange }: SearchFieldProps) {
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
				aria-label="Поиск"
				placeholder="Поиск…"
				value={value}
				onChange={handleChange}
			/>
		</label>
	);
}
