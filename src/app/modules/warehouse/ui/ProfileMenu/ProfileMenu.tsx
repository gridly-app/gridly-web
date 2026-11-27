import {
	IconCheck,
	IconChevronDown,
	IconLogout,
	IconMoon,
	IconPalette,
	IconShieldCog,
	IconSun,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
	accountEntryPath,
	shipmentAdminPath,
	signInPath,
} from "@/ports/navigation";
import { useSession, useWorkspaceMode } from "@/ports/session";
import { errorMessage, useTheme } from "@/shared/lib";
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

import { useWorkspaceNotice } from "../../model/useWorkspaceNotice";

import styles from "./ProfileMenu.module.css";

const sandboxProfile = {
	avatarSeed: "sandbox-guest",
	initials: "Г",
	name: "Гость",
	role: "Песочница",
	logoutLabel: "Выйти из песочницы",
};

export function ProfileMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const { user, logout } = useSession();
	const { dark, setDark } = useTheme();
	const notify = useWorkspaceNotice();
	const isSandbox = mode === "sandbox";
	const accountProfile = {
		avatarSeed: user,
		initials: user.slice(0, 2).toUpperCase(),
		name: user,
		role: "Оператор склада",
		logoutLabel: "Выйти",
	};
	const profile = isSandbox ? sandboxProfile : accountProfile;
	const canOpenAccount = isSandbox && Boolean(user);

	async function leave() {
		if (!isSandbox) await logout();

		await navigate(isSandbox ? "/" : signInPath, { replace: true });
	}

	function handleLogout() {
		setIsOpen(false);
		leave().catch((error: unknown) => notify(errorMessage(error)));
	}

	function handleLightTheme() {
		setDark(false);
		setIsOpen(false);
	}

	function handleDarkTheme() {
		setDark(true);
		setIsOpen(false);
	}

	function handleAdministration() {
		setIsOpen(false);
		void navigate(shipmentAdminPath(mode));
	}

	function handleAccount() {
		setIsOpen(false);
		void navigate(accountEntryPath);
	}

	const trigger = (
		<Button
			variant="ghost"
			className={styles.profileTrigger}
			data-sandbox={isSandbox || undefined}
		/>
	);

	return (
		<Menu open={isOpen} onOpenChange={setIsOpen}>
			<MenuTrigger render={trigger} aria-label="Меню профиля">
				<AvatarExtended className={styles.avatarWrapper}>
					<Avatar className={styles.avatar}>
						<GeneratedAvatar name={profile.avatarSeed} variant="bot">
							{profile.initials}
						</GeneratedAvatar>
					</Avatar>
				</AvatarExtended>
				<span className={styles.profileName}>
					<b>{profile.name}</b>
					<small>{profile.role}</small>
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
						<MenuItem onClick={handleLightTheme}>
							<IconSun size={18} />
							<span>Светлая</span>
							{!dark && <IconCheck size={15} />}
						</MenuItem>
						<MenuItem onClick={handleDarkTheme}>
							<IconMoon size={18} />
							<span>Тёмная</span>
							{dark && <IconCheck size={15} />}
						</MenuItem>
					</MenuPopup>
				</MenuSubmenu>
				<MenuItem onClick={handleAdministration}>
					<IconShieldCog size={18} aria-hidden="true" />
					<span>Администрирование</span>
				</MenuItem>
				{canOpenAccount && (
					<MenuItem onClick={handleAccount}>Мои склады</MenuItem>
				)}
				<MenuItem onClick={handleLogout}>
					<IconLogout size={18} />
					<span>{profile.logoutLabel}</span>
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}
