import type { ComponentProps } from "react";
import { WarmTooltip } from "../overlays/WarmTooltip";
import { TableCell as SpaceTableCell } from "../spaceui/table";
import { Toolbar } from "../spaceui/toolbar";

export {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "../spaceui/table";
export function TableActions(props: ComponentProps<typeof Toolbar>) {
	return (
		<Toolbar
			aria-label="Действия записи"
			className="border-0 bg-transparent p-0"
			{...props}
		/>
	);
}

export function TableCell({
	title,
	children,
	...props
}: ComponentProps<typeof SpaceTableCell>) {
	return (
		<SpaceTableCell {...props}>
			{title ? (
				<WarmTooltip content={title} focusable>
					<span>{children}</span>
				</WarmTooltip>
			) : (
				children
			)}
		</SpaceTableCell>
	);
}
