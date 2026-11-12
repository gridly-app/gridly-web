import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { clsx } from "clsx";
import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";

import css from "./menu.module.css";

export const Menu: typeof MenuPrimitive.Root = MenuPrimitive.Root;

export const MenuPortal: typeof MenuPrimitive.Portal = MenuPrimitive.Portal;

export function MenuTrigger({
	className,
	children,
	...props
}: MenuPrimitive.Trigger.Props): React.ReactElement {
	return (
		<MenuPrimitive.Trigger
			className={className}
			data-slot="menu-trigger"
			{...props}
		>
			{children}
		</MenuPrimitive.Trigger>
	);
}

export function MenuPopup({
	children,
	className,
	sideOffset = 4,
	align = "center",
	alignOffset,
	side = "bottom",
	anchor,
	portalProps,
	...props
}: MenuPrimitive.Popup.Props & {
	align?: MenuPrimitive.Positioner.Props["align"];
	sideOffset?: MenuPrimitive.Positioner.Props["sideOffset"];
	alignOffset?: MenuPrimitive.Positioner.Props["alignOffset"];
	side?: MenuPrimitive.Positioner.Props["side"];
	anchor?: MenuPrimitive.Positioner.Props["anchor"];
	portalProps?: MenuPrimitive.Portal.Props;
}): React.ReactElement {
	return (
		<MenuPortal {...portalProps}>
			<MenuPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className={css.positioner}
				data-slot="menu-positioner"
				side={side}
				sideOffset={sideOffset}
			>
				<MenuPrimitive.Popup
					className={clsx(css.popup, className)}
					data-slot="menu-popup"
					{...props}
				>
					<div className={css.list}>{children}</div>
				</MenuPrimitive.Popup>
			</MenuPrimitive.Positioner>
		</MenuPortal>
	);
}

export function MenuItem({
	className,
	inset,
	variant = "default",
	...props
}: MenuPrimitive.Item.Props & {
	inset?: boolean;
	variant?: "default" | "destructive";
}): React.ReactElement {
	return (
		<MenuPrimitive.Item
			className={clsx(css.item, className)}
			data-inset={inset}
			data-slot="menu-item"
			data-variant={variant}
			{...props}
		/>
	);
}

export function MenuLinkItem({
	className,
	inset,
	variant = "default",
	closeOnClick = true,
	...props
}: MenuPrimitive.LinkItem.Props & {
	inset?: boolean;
	variant?: "default" | "destructive";
}): React.ReactElement {
	return (
		<MenuPrimitive.LinkItem
			className={clsx(css.item, className)}
			closeOnClick={closeOnClick}
			data-inset={inset}
			data-slot="menu-link-item"
			data-variant={variant}
			{...props}
		/>
	);
}

export function MenuCheckboxItem({
	className,
	children,
	checked,
	variant = "default",
	...props
}: MenuPrimitive.CheckboxItem.Props & {
	variant?: "default" | "switch";
}): React.ReactElement {
	return (
		<MenuPrimitive.CheckboxItem
			checked={checked}
			className={clsx(
				css.checkboxItem,
				variant === "switch"
					? css.checkboxItemWithSwitch
					: css.checkboxItemWithCheckmark,
				className,
			)}
			data-slot="menu-checkbox-item"
			{...props}
		>
			{variant === "switch" ? (
				<>
					<span className={css.switchLabel}>{children}</span>
					<MenuPrimitive.CheckboxItemIndicator
						className={css.switchTrack}
						keepMounted
					>
						<span className={css.switchThumb} />
					</MenuPrimitive.CheckboxItemIndicator>
				</>
			) : (
				<>
					<MenuPrimitive.CheckboxItemIndicator
						className={css.selectionIndicator}
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
					</MenuPrimitive.CheckboxItemIndicator>
					<span className={css.selectionText}>{children}</span>
				</>
			)}
		</MenuPrimitive.CheckboxItem>
	);
}

export function MenuSub(
	props: MenuPrimitive.SubmenuRoot.Props,
): React.ReactElement {
	return <MenuPrimitive.SubmenuRoot data-slot="menu-sub" {...props} />;
}

export function MenuSubTrigger({
	className,
	inset,
	children,
	...props
}: MenuPrimitive.SubmenuTrigger.Props & {
	inset?: boolean;
}): React.ReactElement {
	return (
		<MenuPrimitive.SubmenuTrigger
			className={clsx(css.subTrigger, className)}
			data-inset={inset}
			data-slot="menu-sub-trigger"
			{...props}
		>
			{children}
			<ChevronRightIcon className={css.chevronRightIcon} />
		</MenuPrimitive.SubmenuTrigger>
	);
}
