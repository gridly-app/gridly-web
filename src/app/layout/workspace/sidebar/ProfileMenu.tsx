import {
	IconCheck,
	IconChevronDown,
	IconLogout,
	IconMoon,
	IconPalette,
	IconSun,
} from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/shared/ui/controls";
import {
	Avatar,
	AvatarExtended,
	GeneratedAvatar,
} from "@/shared/ui/dataDisplay";
import {
	Menu,
	MenuItem,
	MenuPopup,
	MenuSubmenu,
	MenuSubmenuTrigger,
	MenuTrigger,
} from "@/shared/ui/overlays";
import styles from "./ProfileMenu.module.css";

export interface ProfileMenuProps {
	isDemo: boolean;
	user: string;
	dark: boolean;
	setDark: (dark: boolean) => void;
	logout: () => void;
	account: () => void;
}

export default function ProfileMenu({
	isDemo,
	user,
	dark,
	setDark,
	logout,
	account,
}: ProfileMenuProps) {
	const [open, setOpen] = useState(false);

	function selectTheme(dark: boolean) {
		setDark(dark);
		setOpen(false);
	}

	return (
		<Menu open={open} onOpenChange={setOpen}>
			<MenuTrigger
				render={
					<Button
						variant="ghost"
						className={styles.profileTrigger}
						data-demo={isDemo || undefined}
					/>
				}
				aria-label="Меню профиля"
			>
				<AvatarExtended className={styles.avatarWrapper}>
					<Avatar className={styles.avatar}>
						<GeneratedAvatar name={isDemo ? "gridly-demo" : user} variant="bot">
							{isDemo ? "Д" : user.slice(0, 2).toUpperCase()}
						</GeneratedAvatar>
					</Avatar>
				</AvatarExtended>
				<span className={styles.profileName}>
					<b>{isDemo ? "Демо-режим" : user}</b>
					<small>{isDemo ? "Gridly" : "Оператор склада"}</small>
				</span>
				<IconChevronDown className={styles.profileChevron} size={16} />
			</MenuTrigger>
			<MenuPopup
				side="top"
				align="start"
				sideOffset={8}
				className={styles.profileMenu}
			>
				<MenuSubmenu>
					<MenuSubmenuTrigger>
						<IconPalette size={18} />
						<span>Тема</span>
					</MenuSubmenuTrigger>
					<MenuPopup side="right" sideOffset={8} className={styles.profileMenu}>
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
				{isDemo && user && (
					<MenuItem
						onClick={() => {
							setOpen(false);
							account();
						}}
					>
						Мои склады
					</MenuItem>
				)}
				<MenuItem
					onClick={() => {
						setOpen(false);
						logout();
					}}
				>
					<IconLogout size={18} />
					<span>{isDemo ? "Выйти из демо" : "Выйти"}</span>
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}
