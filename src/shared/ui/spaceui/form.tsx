import { Form as FormPrimitive } from "@base-ui/react/form";
import { clsx } from "clsx";
import type React from "react";
import css from "./form.module.css";

export function Form({
	className,
	...props
}: FormPrimitive.Props): React.ReactElement {
	return (
		<FormPrimitive
			className={clsx(css.root, className)}
			data-slot="form"
			{...props}
		/>
	);
}
