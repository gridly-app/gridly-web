import { clsx } from "clsx";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { WarmTooltip } from "../overlays/WarmTooltip";
import { Input } from "../spaceui/input";
import {
	Select as Root,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "../spaceui/select";
import styles from "./Select.module.css";

interface SelectOption {
	value: string;
	label: string;
}
export interface SelectProps {
	options: SelectOption[];
	icon?: ReactNode;
	value: string;
	onValueChange: (value: string) => void;
	"aria-label": string;
	className?: string | undefined;
	disabled?: boolean | undefined;
	searchable?: boolean | undefined;
	searchLabel?: string | undefined;
}
export function Select({
	options,
	icon,
	value,
	onValueChange,
	className,
	disabled,
	searchable,
	searchLabel = "Поиск по списку",
	"aria-label": label,
}: SelectProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const filtered = searchable
		? options.filter((option) =>
				option.label
					.toLocaleLowerCase("ru")
					.includes(search.trim().toLocaleLowerCase("ru")),
			)
		: options;
	useEffect(() => {
		if (!open || !searchable) return;
		const frame = requestAnimationFrame(() => searchRef.current?.focus());
		return () => cancelAnimationFrame(frame);
	}, [open, searchable]);
	return (
		<Root
			items={options}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setSearch("");
			}}
			value={value}
			onValueChange={(next) => {
				if (next !== null) onValueChange(next);
			}}
			disabled={disabled}
			modal={false}
		>
			<WarmTooltip
				content={
					options.find((option) => option.value === value)?.label || label
				}
				disabled={open || disabled}
			>
				<SelectTrigger
					aria-label={label}
					className={clsx(styles.trigger, className)}
				>
					{icon}
					<SelectValue />
				</SelectTrigger>
			</WarmTooltip>
			<SelectPopup
				alignItemWithTrigger={false}
				header={
					searchable ? (
						<div className={styles.search}>
							<Input
								nativeInput
								ref={searchRef}
								aria-label={searchLabel}
								placeholder={searchLabel}
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "ArrowDown") {
										event.preventDefault();
										event.currentTarget
											.closest('[data-slot="select-popup"]')
											?.querySelector<HTMLElement>('[role="option"]')
											?.focus();
									} else if (event.key !== "Escape" && event.key !== "Tab")
										event.stopPropagation();
								}}
							/>
							{filtered.length === 0 && <p role="status">Ничего не найдено</p>}
						</div>
					) : undefined
				}
			>
				{filtered.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectPopup>
		</Root>
	);
}
