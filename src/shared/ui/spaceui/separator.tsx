import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { clsx } from "clsx";
import type React from "react";

import css from "./separator.module.css";

export function Separator({
	className,
	orientation = "horizontal",
	...props
}: SeparatorPrimitive.Props): React.ReactElement {
	return (
		<SeparatorPrimitive
			className={clsx(css.root, className)}
			data-slot="separator"
			orientation={orientation}
			{...props}
		/>
	);
}
