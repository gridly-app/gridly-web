import type { ComponentProps } from "react";
import { Badge } from "../spaceui/badge";

export { Card as MiniCard } from "../spaceui/card";
export function TableIcon(props: ComponentProps<typeof Badge>) {
	return (
		<Badge
			variant="secondary"
			className="mr-2 inline-flex size-8 items-center justify-center align-middle"
			{...props}
		/>
	);
}
