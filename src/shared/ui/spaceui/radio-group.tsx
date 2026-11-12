import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { clsx } from "clsx";
import type React from "react";

import css from "./radio-group.module.css";

export function RadioGroup({
	className,
	...props
}: RadioGroupPrimitive.Props): React.ReactElement {
	return (
		<RadioGroupPrimitive
			className={clsx(css.root, className)}
			data-slot="radio-group"
			{...props}
		/>
	);
}
export { RadioPrimitive };
