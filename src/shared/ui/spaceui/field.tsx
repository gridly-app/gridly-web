import { Field as FieldPrimitive } from "@base-ui/react/field";
import { clsx } from "clsx";
import type React from "react";

import css from "./field.module.css";

export function Field({
	className,
	...props
}: FieldPrimitive.Root.Props): React.ReactElement {
	return (
		<FieldPrimitive.Root
			className={clsx(css.root, className)}
			data-slot="field"
			{...props}
		/>
	);
}

export function FieldLabel({
	className,
	...props
}: FieldPrimitive.Label.Props): React.ReactElement {
	return (
		<FieldPrimitive.Label
			className={clsx(css.label, className)}
			data-slot="field-label"
			{...props}
		/>
	);
}

export function FieldError({
	className,
	...props
}: FieldPrimitive.Error.Props): React.ReactElement {
	return (
		<FieldPrimitive.Error
			className={clsx(css.error, className)}
			data-slot="field-error"
			{...props}
		/>
	);
}
