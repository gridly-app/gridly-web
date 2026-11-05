import {
	IconCheck,
	IconChevronDown,
	IconLogout,
	IconMoon,
	IconPalette,
	IconRefresh,
	IconSun,
} from "@tabler/icons-react";
import {
	Avatar,
	Button,
	Menu,
	MenuItem,
	MenuPopup,
	MenuSubmenu,
	MenuSubmenuTrigger,
	MenuTrigger,
} from "@/shared/ui";
import {
	AvatarExtended,
	AvatarFallback as GeneratedAvatar,
} from "@/shared/ui/spaceui/avatar-extended";
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
						className={workspaceSidebarStyles.profileTrigger}
						data-demo={props.isDemo || undefined}
					/>
				}
				aria-label="Меню профиля"
			>
				<AvatarExtended className={workspaceSidebarStyles.avatarWrapper}>
					<Avatar className={workspaceSidebarStyles.avatar}>
						<GeneratedAvatar
							name={props.isDemo ? "gridly-demo" : user}
							variant="bot"
						>
							{props.isDemo ? "Д" : user.slice(0, 2).toUpperCase()}
						</GeneratedAvatar>
					</Avatar>
				</AvatarExtended>
				<span className={workspaceSidebarStyles.profileName}>
					<b>{props.isDemo ? "Демо-режим" : user}</b>
					<small>{props.isDemo ? "Gridly" : "Оператор склада"}</small>
				</span>
				<IconChevronDown
					className={workspaceSidebarStyles.profileChevron}
					size={16}
				/>
			</MenuTrigger>
			<MenuPopup
				side="top"
				align="start"
				sideOffset={8}
				className={workspaceSidebarStyles.profileMenu}
			>
				<MenuSubmenu>
					<MenuSubmenuTrigger className="[&>svg:last-child]:hidden">
						<IconPalette size={18} />
						<span>Тема</span>
					</MenuSubmenuTrigger>
					<MenuPopup
						side="right"
						sideOffset={8}
						className={workspaceSidebarStyles.profileMenu}
					>
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
				{props.isDemo && (
					<>
						<MenuItem
							onClick={() => {
								setOpen(false);
								props.restartDemo();
							}}
						>
							<IconRefresh size={18} />
							<span>Начать заново</span>
						</MenuItem>
						{props.user && (
							<MenuItem
								onClick={() => {
									setOpen(false);
									props.account();
								}}
							>
								Мои склады
							</MenuItem>
						)}
					</>
				)}
				<MenuItem onClick={logout}>
					<IconLogout size={18} />
					<span>{props.isDemo ? "Выйти из демо" : "Выйти"}</span>
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}
