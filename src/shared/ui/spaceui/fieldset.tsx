"use client";

import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";
import type React from "react";

export function Fieldset({
	className,
	...props
}: FieldsetPrimitive.Root.Props): React.ReactElement {
	return (
		<FieldsetPrimitive.Root
			className={className}
			data-slot="fieldset"
			{...props}
		/>
	);
}
