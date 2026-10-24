import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import type { ComboboxOption } from "@/shared/lib";
import { useCombobox } from "@/shared/lib";
import controlStyles from "../controls/Control.module.css";
import comboboxStyles from "./Combobox.module.css";

export interface ComboboxProps {
	options: ComboboxOption[];
	className?: string;
	name?: string;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	required?: boolean;
	disabled?: boolean;
	placeholder?: string;
	"aria-label"?: string;
}

export type { ComboboxOption } from "@/shared/lib";

function equalOption(item: ComboboxOption, value: ComboboxOption) {
	return item.value === value.value;
}

function renderOption(item: ComboboxOption) {
	return (
		<ComboboxPrimitive.Item
			className={comboboxStyles["space-combobox-item"]}
			key={item.value}
			value={item}
		>
			{item.label}
			<ComboboxPrimitive.ItemIndicator>
				<IconCheck size={15} />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

export function Combobox({
	options,
	className = "",
	name,
	value,
	defaultValue,
	onValueChange,
	required,
	disabled,
	placeholder = "Выберите значение",
	"aria-label": label,
}: ComboboxProps) {
	const { items, selected, initial, handleValueChange } = useCombobox({
		options,
		value,
		defaultValue,
		onValueChange,
	});

	return (
		<ComboboxPrimitive.Root
			items={items}
			name={name}
			value={selected}
			defaultValue={initial}
			onValueChange={handleValueChange}
			isItemEqualToValue={equalOption}
			required={required}
			disabled={disabled}
			modal={false}
			autoHighlight
		>
			<div
				className={`${comboboxStyles["space-combobox-control"]} ${className}`}
				data-slot="combobox-control"
			>
				<ComboboxPrimitive.Input
					className={controlStyles.control}
					aria-label={label}
					placeholder={placeholder}
				/>
				<ComboboxPrimitive.Trigger
					className={comboboxStyles["space-combobox-trigger"]}
					aria-label="Раскрыть список"
				>
					<IconSelector size={16} />
				</ComboboxPrimitive.Trigger>
			</div>
			<ComboboxPrimitive.Portal>
				<ComboboxPrimitive.Positioner
					className={comboboxStyles["space-combobox-positioner"]}
					sideOffset={6}
				>
					<ComboboxPrimitive.Popup
						className={comboboxStyles["space-combobox-popup"]}
					>
						<ComboboxPrimitive.Empty
							className={comboboxStyles["space-combobox-empty"]}
						>
							Ничего не найдено
						</ComboboxPrimitive.Empty>
						<ComboboxPrimitive.List
							className={comboboxStyles["space-combobox-list"]}
						>
							{renderOption}
						</ComboboxPrimitive.List>
					</ComboboxPrimitive.Popup>
				</ComboboxPrimitive.Positioner>
			</ComboboxPrimitive.Portal>
		</ComboboxPrimitive.Root>
	);
}
