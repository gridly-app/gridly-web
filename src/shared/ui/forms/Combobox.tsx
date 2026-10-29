import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import type { ComboboxOption } from "@/shared/lib";
import { useCombobox } from "@/shared/lib";
import controlStyles from "../controls/Control.module.css";
import comboboxStyles from "./Combobox.module.css";

export interface ComboboxProps {
	options: ComboboxOption[];
	className?: string | undefined;
	name?: string | undefined;
	value?: string | undefined;
	defaultValue?: string | undefined;
	onValueChange?: ((value: string) => void) | undefined;
	required?: boolean | undefined;
	disabled?: boolean | undefined;
	placeholder?: string | undefined;
	"aria-label"?: string | undefined;
}

export type { ComboboxOption } from "@/shared/lib";

function equalOption(item: ComboboxOption, value: ComboboxOption) {
	return item.value === value.value;
}

function renderOption(item: ComboboxOption) {
	return (
		<ComboboxPrimitive.Item
			className={comboboxStyles.spaceComboboxItem}
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
				className={`${comboboxStyles.spaceComboboxControl} ${className}`}
				data-slot="combobox-control"
			>
				<ComboboxPrimitive.Input
					className={controlStyles.control}
					aria-label={label}
					placeholder={placeholder}
				/>
				<ComboboxPrimitive.Trigger
					className={comboboxStyles.spaceComboboxTrigger}
					aria-label="Раскрыть список"
				>
					<IconSelector size={16} />
				</ComboboxPrimitive.Trigger>
			</div>
			<ComboboxPrimitive.Portal>
				<ComboboxPrimitive.Positioner
					className={comboboxStyles.spaceComboboxPositioner}
					sideOffset={6}
				>
					<ComboboxPrimitive.Popup
						className={comboboxStyles.spaceComboboxPopup}
					>
						<ComboboxPrimitive.Empty
							className={comboboxStyles.spaceComboboxEmpty}
						>
							Ничего не найдено
						</ComboboxPrimitive.Empty>
						<ComboboxPrimitive.List
							className={comboboxStyles.spaceComboboxList}
						>
							{renderOption}
						</ComboboxPrimitive.List>
					</ComboboxPrimitive.Popup>
				</ComboboxPrimitive.Positioner>
			</ComboboxPrimitive.Portal>
		</ComboboxPrimitive.Root>
	);
}
