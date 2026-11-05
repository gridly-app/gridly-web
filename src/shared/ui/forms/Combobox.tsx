import { useState } from "react";
import type { ComboboxOption } from "@/shared/lib";
import { WarmTooltip } from "../overlays/WarmTooltip";
import {
	Select as Root,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "../spaceui/select";
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

export function Combobox({
	options,
	className,
	name,
	value,
	defaultValue,
	onValueChange,
	required,
	disabled,
	placeholder = "Выберите значение",
	"aria-label": label,
}: ComboboxProps) {
	const [open, setOpen] = useState(false);
	const [selection, setSelection] = useState(defaultValue || "");
	return (
		<Root
			onOpenChange={setOpen}
			items={options}
			name={name}
			value={(value ?? selection) || null}
			onValueChange={(next) => {
				setSelection(next ?? "");
				onValueChange?.(next ?? "");
			}}
			required={required}
			disabled={disabled}
			modal={false}
		>
			<WarmTooltip
				content={
					options.find((option) => option.value === (value ?? selection))
						?.label || placeholder
				}
				disabled={open || disabled}
			>
				<SelectTrigger className={className} aria-label={label}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
			</WarmTooltip>
			<SelectPopup alignItemWithTrigger={false}>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectPopup>
		</Root>
	);
}
