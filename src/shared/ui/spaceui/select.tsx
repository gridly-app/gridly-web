import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";
import css from "./select.module.css";
import { useGlideHighlight } from "./useGlideHighlight";

export const Select: typeof SelectPrimitive.Root = SelectPrimitive.Root;

export const selectTriggerVariants = cva(css.selectTrigger, {
	defaultVariants: {
		size: "default",
	},
	variants: {
		size: {
			default: "",
			lg: css.sizeLg,
			sm: css.sizeSm,
		},
	},
});

export const selectTriggerIconClassName = css.selectTriggerIcon;

export function SelectTrigger({
	className,
	size = "default",
	children,
	...props
}: SelectPrimitive.Trigger.Props &
	VariantProps<typeof selectTriggerVariants>): React.ReactElement {
	return (
		<SelectPrimitive.Trigger
			className={clsx(selectTriggerVariants({ size }), className)}
			data-slot="select-trigger"
			{...props}
		>
			{children}
			<SelectPrimitive.Icon className={css.triggerIcon} data-slot="select-icon">
				<ChevronDownIcon className={selectTriggerIconClassName} />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

export function SelectValue({
	className,
	...props
}: SelectPrimitive.Value.Props): React.ReactElement {
	return (
		<SelectPrimitive.Value
			className={clsx(css.value, className)}
			data-slot="select-value"
			{...props}
		/>
	);
}

const SelectPopupContext = React.createContext<{ showIcon: boolean }>({
	showIcon: true,
});

export function SelectPopup({
	className,
	children,
	showIcon = true,
	side = "bottom",
	sideOffset = 4,
	align = "start",
	alignOffset = 0,
	alignItemWithTrigger = true,
	anchor,
	portalProps,
	header,
	...props
}: SelectPrimitive.Popup.Props & {
	header?: React.ReactNode;
	showIcon?: boolean;
	portalProps?: SelectPrimitive.Portal.Props;
	side?: SelectPrimitive.Positioner.Props["side"];
	sideOffset?: SelectPrimitive.Positioner.Props["sideOffset"];
	align?: SelectPrimitive.Positioner.Props["align"];
	alignOffset?: SelectPrimitive.Positioner.Props["alignOffset"];
	alignItemWithTrigger?: SelectPrimitive.Positioner.Props["alignItemWithTrigger"];
	anchor?: SelectPrimitive.Positioner.Props["anchor"];
}): React.ReactElement {
	const { listRef, highlightRef } = useGlideHighlight();
	return (
		<SelectPopupContext.Provider value={{ showIcon }}>
			<SelectPrimitive.Portal {...portalProps}>
				<SelectPrimitive.Positioner
					align={align}
					alignItemWithTrigger={alignItemWithTrigger}
					alignOffset={alignOffset}
					anchor={anchor}
					className={css.positioner}
					data-slot="select-positioner"
					side={side}
					sideOffset={sideOffset}
				>
					<SelectPrimitive.Popup
						className={css.popup}
						data-slot="select-popup"
						data-glide-select=""
						{...props}
					>
						<SelectPrimitive.ScrollUpArrow
							className={css.scrollUpArrow}
							data-slot="select-scroll-up-arrow"
						>
							<ChevronUpIcon className={css.chevronUpIcon} />
						</SelectPrimitive.ScrollUpArrow>
						<div className={css.popupSurface}>
							{header}
							<SelectPrimitive.List
								ref={listRef}
								className={clsx(
									css.list,
									!showIcon && css.listWithoutIcons,
									className,
								)}
								data-slot="select-list"
							>
								<span
									ref={highlightRef}
									className={css.highlight}
									data-slot="glide-select-highlight"
									aria-hidden="true"
								/>
								{children}
							</SelectPrimitive.List>
						</div>
						<SelectPrimitive.ScrollDownArrow
							className={css.scrollDownArrow}
							data-slot="select-scroll-down-arrow"
						>
							<ChevronDownIcon className={css.chevronUpIcon} />
						</SelectPrimitive.ScrollDownArrow>
					</SelectPrimitive.Popup>
				</SelectPrimitive.Positioner>
			</SelectPrimitive.Portal>
		</SelectPopupContext.Provider>
	);
}

export function SelectItem({
	className,
	showIcon,
	children,
	...props
}: SelectPrimitive.Item.Props & { showIcon?: boolean }): React.ReactElement {
	const context = React.useContext(SelectPopupContext);
	const isShowIcon = showIcon ?? context.showIcon;

	return (
		<SelectPrimitive.Item
			className={clsx(
				css.item,
				isShowIcon ? css.itemWithIcon : css.itemWithoutIcon,
				className,
			)}
			data-slot="select-item"
			{...props}
		>
			{isShowIcon && (
				<SelectPrimitive.ItemIndicator
					className={css.itemIndicator}
					data-slot="select-item-indicator"
				>
					<svg
						aria-hidden="true"
						fill="none"
						height="24"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						viewBox="0 0 24 24"
						width="24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
					</svg>
				</SelectPrimitive.ItemIndicator>
			)}
			<SelectPrimitive.ItemText
				data-slot="select-item-text"
				className={clsx(
					css.button,
					css.itemText,
					isShowIcon ? css.itemTextWithIcon : css.itemTextWithoutIcon,
				)}
			>
				{children}
			</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}
