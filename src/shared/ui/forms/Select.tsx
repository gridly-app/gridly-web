import { Select as Primitive } from "@base-ui/react/select";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import control from "../controls/Control.module.css";
import styles from "./Combobox.module.css";

interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps {
	options: SelectOption[];
	value: string;
	onValueChange: (value: string) => void;
	"aria-label": string;
	className?: string;
	disabled?: boolean;
}

export function Select({
	options,
	value,
	onValueChange,
	className = "",
	disabled,
	"aria-label": label,
}: SelectProps) {
	return (
		<Primitive.Root
			items={options}
			value={value}
			onValueChange={(next) => {
				if (next !== null) onValueChange(next);
			}}
			disabled={disabled}
			modal={false}
		>
			<Primitive.Trigger
				className={`${control.control} ${className}`}
				aria-label={label}
			>
				<Primitive.Value />
				<Primitive.Icon>
					<IconSelector size={16} />
				</Primitive.Icon>
			</Primitive.Trigger>
			<Primitive.Portal>
				<Primitive.Positioner
					className={styles["space-combobox-positioner"]}
					sideOffset={6}
					alignItemWithTrigger={false}
				>
					<Primitive.Popup className={styles["space-combobox-popup"]}>
						<Primitive.List className={styles["space-combobox-list"]}>
							{options.map((option) => (
								<Primitive.Item
									key={option.value}
									value={option.value}
									className={styles["space-combobox-item"]}
								>
									<Primitive.ItemText>{option.label}</Primitive.ItemText>
									<Primitive.ItemIndicator>
										<IconCheck size={15} />
									</Primitive.ItemIndicator>
								</Primitive.Item>
							))}
						</Primitive.List>
					</Primitive.Popup>
				</Primitive.Positioner>
			</Primitive.Portal>
		</Primitive.Root>
	);
}
