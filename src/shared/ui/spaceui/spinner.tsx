import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import type * as React from "react";

import css from "./spinner.module.css";

export function Spinner({
	className,
	...props
}: React.ComponentProps<typeof Loader2>): React.ReactElement {
	return (
		<Loader2
			aria-label="Loading"
			className={clsx(css.root, className)}
			role="status"
			data-slot="spinner"
			{...props}
		/>
	);
}
