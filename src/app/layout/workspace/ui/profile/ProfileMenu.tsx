import {
	IconCheck,
	IconChevronDown,
	IconChevronRight,
	IconLogout,
	IconMoon,
	IconPalette,
	IconPlayerPlay,
	IconSun,
} from "@tabler/icons-react";
import {
	Avatar,
	AvatarFallback,
	Button,
	Menu,
	MenuItem,
	MenuPopup,
	MenuSubmenu,
	MenuSubmenuTrigger,
	MenuTrigger,
} from "@/shared/ui";
import type { ProfileMenuOptions } from "../../model/profile/useProfileMenu";
import { useProfileMenu } from "../../model/profile/useProfileMenu";
import workspaceSidebarStyles from "../WorkspaceSidebar.module.css";

export type ProfileMenuProps = ProfileMenuOptions;

export default function ProfileMenu(props: ProfileMenuProps) {
	const { open, setOpen, user, selectTheme, dark, logout } =
		useProfileMenu(props);

	return (
		<Menu open={open} onOpenChange={setOpen}>
			<MenuTrigger
				render={
					<Button
						variant="ghost"
						className={workspaceSidebarStyles["profile-trigger"]}
						data-demo={props.isDemo || undefined}
					/>
				}
				aria-label="Меню профиля"
			>
				<Avatar className={workspaceSidebarStyles.avatar}>
					<AvatarFallback>
						{props.isDemo ? (
							<IconPlayerPlay size={18} />
						) : (
							user.slice(0, 2).toUpperCase()
						)}
					</AvatarFallback>
				</Avatar>
				<span className={workspaceSidebarStyles["profile-name"]}>
					<b>{props.isDemo ? "Демо-режим" : user}</b>
					<small>{props.isDemo ? "Gridly" : "Оператор склада"}</small>
				</span>
				<IconChevronDown size={16} />
			</MenuTrigger>
			<MenuPopup side="top">
				<MenuSubmenu>
					<MenuSubmenuTrigger>
						<IconPalette size={18} />
						<span>Тема</span>
						<IconChevronRight size={15} />
					</MenuSubmenuTrigger>
					<MenuPopup side="right">
						<MenuItem onClick={() => selectTheme(false)}>
							<IconSun size={18} />
							<span>Светлая</span>
							{!dark && <IconCheck size={15} />}
						</MenuItem>
						<MenuItem onClick={() => selectTheme(true)}>
							<IconMoon size={18} />
							<span>Тёмная</span>
							{dark && <IconCheck size={15} />}
						</MenuItem>
					</MenuPopup>
				</MenuSubmenu>
				<MenuItem onClick={logout}>
					<IconLogout size={18} />
					<span>{props.isDemo ? "Выйти из демо-режима" : "Выйти"}</span>
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}
