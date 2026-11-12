import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { clsx } from "clsx";
import type React from "react";

import css from "./avatar.module.css";

export function Avatar({
	className,
	...props
}: AvatarPrimitive.Root.Props): React.ReactElement {
	return (
		<AvatarPrimitive.Root
			className={clsx(css.root, className)}
			data-slot="avatar"
			{...props}
		/>
	);
}
