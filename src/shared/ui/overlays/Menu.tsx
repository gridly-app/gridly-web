import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { mergeClassName } from "../mergeClassName";
import menuStyles from "./Menu.module.css";

export type MenuPopupProps = MenuPrimitive.Popup.Props & {
	side?: MenuPrimitive.Positioner.Props["side"];
	align?: MenuPrimitive.Positioner.Props["align"];
};

export const Menu = MenuPrimitive.Root;

export const MenuTrigger = MenuPrimitive.Trigger;

export const MenuSubmenu = MenuPrimitive.SubmenuRoot;

export function MenuSubmenuTrigger({
	className = "",
	...props
}: MenuPrimitive.SubmenuTrigger.Props) {
	return (
		<MenuPrimitive.SubmenuTrigger
			className={mergeClassName(menuStyles["space-menu-item"], className)}
			{...props}
		/>
	);
}

export function MenuPopup({
	side = "bottom",
	align = "start",
	className = "",
	...props
}: MenuPopupProps) {
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Positioner
				className={menuStyles["space-menu-positioner"]}
				side={side}
				align={align}
				sideOffset={6}
			>
				<MenuPrimitive.Popup
					className={mergeClassName(menuStyles["space-menu-popup"], className)}
					data-slot="menu-popup"
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	);
}

export function MenuItem({
	className = "",
	...props
}: MenuPrimitive.Item.Props) {
	return (
		<MenuPrimitive.Item
			className={mergeClassName(menuStyles["space-menu-item"], className)}
			data-slot="menu-item"
			{...props}
		/>
	);
}
