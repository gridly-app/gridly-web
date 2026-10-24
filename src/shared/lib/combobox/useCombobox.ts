export interface ComboboxOption {
	value: string;
	label: string;
}

export interface ComboboxOptions {
	options: ComboboxOption[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
}

export function useCombobox({
	options,
	value,
	defaultValue,
	onValueChange,
}: ComboboxOptions) {
	const selected =
		value === undefined
			? undefined
			: (options.find((item) => item.value === value) ?? null);
	const initial = options.find((item) => item.value === defaultValue) ?? null;

	function handleValueChange(item: ComboboxOption | null) {
		onValueChange?.(item?.value ?? "");
	}

	return { items: options, selected, initial, handleValueChange };
}
