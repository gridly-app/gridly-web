import {
	Children,
	type ComponentProps,
	cloneElement,
	createContext,
	isValidElement,
	useContext,
} from "react";
import { WarmTooltip } from "../overlays/WarmTooltip";
import {
	Table as SpaceTable,
	TableCell as SpaceTableCell,
	TableRow as SpaceTableRow,
} from "../spaceui/table";
import { Toolbar } from "../spaceui/toolbar";
import styles from "./Table.module.css";

export { TableBody, TableHead, TableHeader } from "../spaceui/table";

export function TableNote({
	as: Element = "small",
	children,
}: Pick<ComponentProps<"small">, "children"> & { as?: "small" | "span" }) {
	return <Element className={styles.note}>{children}</Element>;
}

const HiddenColumns = createContext<readonly number[]>([]);

export function Table({
	hiddenColumns = [],
	...props
}: ComponentProps<typeof SpaceTable> & {
	hiddenColumns?: readonly number[] | undefined;
}) {
	return (
		<HiddenColumns.Provider value={hiddenColumns}>
			<SpaceTable {...props} />
		</HiddenColumns.Provider>
	);
}

export function TableRow({
	children,
	...props
}: ComponentProps<typeof SpaceTableRow>) {
	const hidden = useContext(HiddenColumns);
	return (
		<SpaceTableRow {...props}>
			{!hidden.length
				? children
				: Children.map(children, (child, index) => {
						if (
							isValidElement<{ colSpan?: number }>(child) &&
							child.props.colSpan
						) {
							return cloneElement(child, {
								colSpan: Math.max(1, child.props.colSpan - hidden.length),
							});
						}
						return hidden.includes(index) ? null : child;
					})}
		</SpaceTableRow>
	);
}
export function TableActions(props: ComponentProps<typeof Toolbar>) {
	return (
		<Toolbar
			aria-label="Действия записи"
			className={styles.actions}
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
