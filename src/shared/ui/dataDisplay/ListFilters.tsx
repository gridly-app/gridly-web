import {
	IconAdjustmentsHorizontal,
	IconChevronDown,
	IconX,
} from "@tabler/icons-react";
import {
	Children,
	Fragment,
	isValidElement,
	type ReactNode,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "../controls/Button";
import { IconButton } from "../controls/IconButton";

function filterItems(children: ReactNode): ReactNode[] {
	return Children.toArray(children).flatMap((child) =>
		isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
			? filterItems(child.props.children)
			: [child],
	);
}

export function ListFilters({
	count,
	onReset,
	children,
}: {
	count: number;
	onReset: () => void;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [inline, setInline] = useState(false);
	const host = useRef<HTMLDivElement>(null);
	const fields = useRef<HTMLDivElement>(null);
	const id = useId();
	useLayoutEffect(() => {
		const toolbar = host.current?.closest<HTMLElement>('[data-slot="toolbar"]');
		const container = fields.current;
		if (!toolbar || !container) return;
		const measure = () => {
			const style = getComputedStyle(toolbar);
			const available =
				toolbar.clientWidth -
				parseFloat(style.paddingLeft) -
				parseFloat(style.paddingRight);
			const siblings = Array.from(toolbar.children).filter(
				(child): child is HTMLElement =>
					child instanceof HTMLElement && child !== host.current,
			);
			const controls = siblings.filter(
				(child) => getComputedStyle(child).display !== "none",
			);
			const fixedWidth = controls.reduce(
				(sum, child) =>
					sum +
					(child.matches('[data-slot="input-group"]')
						? Math.max(180, parseFloat(getComputedStyle(child).minWidth) || 0)
						: child.getBoundingClientRect().width),
				0,
			);
			const filters = Array.from(
				container.querySelectorAll<HTMLElement>(":scope > .list-filter-field"),
			);
			const filterWidth = filters.reduce(
				(sum, child) =>
					sum + (parseFloat(getComputedStyle(child).flexBasis) || 200),
				0,
			);
			const gap = parseFloat(style.columnGap) || 12;
			const needed =
				fixedWidth +
				filterWidth +
				(count ? 36 : 0) +
				gap *
					Math.max(0, controls.length + filters.length + (count ? 1 : 0) - 1);
			setInline(needed <= available - 4);
		};
		const observer = new ResizeObserver(measure);
		observer.observe(toolbar);
		for (const child of toolbar.children)
			if (child !== host.current) observer.observe(child);
		const changes = new MutationObserver(measure);
		changes.observe(container, { childList: true });
		measure();
		return () => {
			observer.disconnect();
			changes.disconnect();
		};
	}, [count]);
	return (
		<div
			ref={host}
			className="list-filters"
			data-open={open || undefined}
			data-inline={inline || undefined}
		>
			{!inline && (
				<div className="list-filters-actions">
					<Button
						variant="secondary"
						aria-expanded={open}
						aria-controls={id}
						onClick={() => setOpen(!open)}
					>
						<IconAdjustmentsHorizontal size={16} />
						Фильтры
						{count > 0 && <span className="list-filters-count">{count}</span>}
						<IconChevronDown size={14} className="list-filters-chevron" />
					</Button>
					{count > 0 && (
						<Button
							variant="ghost"
							className="list-filters-reset"
							onClick={onReset}
						>
							Сбросить фильтры
						</Button>
					)}
				</div>
			)}
			<div
				ref={fields}
				id={id}
				className="list-filters-fields"
				hidden={!inline && !open}
			>
				{filterItems(children).map((child, index) => (
					<div
						className="list-filter-field"
						key={isValidElement(child) ? (child.key ?? index) : index}
					>
						{child}
					</div>
				))}
				{inline && count > 0 && (
					<IconButton
						data-filter-reset=""
						label="Сбросить фильтры"
						icon={<IconX size={16} />}
						onClick={onReset}
					/>
				)}
			</div>
		</div>
	);
}
