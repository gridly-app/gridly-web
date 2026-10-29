import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { IconCheck } from "@tabler/icons-react";
import { mergeClassName } from "../mergeClassName";
import checkboxStyles from "./Checkbox.module.css";

export type CheckboxProps = CheckboxPrimitive.Root.Props;

export function Checkbox({ className = "", ...props }: CheckboxProps) {
	return (
		<CheckboxPrimitive.Root
			className={mergeClassName(checkboxStyles.spaceCheckbox, className)}
			data-slot="checkbox"
			{...props}
		>
			<CheckboxPrimitive.Indicator>
				<IconCheck size={13} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}
