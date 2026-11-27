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

export function ProfileMenu() {
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const { user, logout: endSession } = useSession();
	const { dark, setDark } = useTheme();
	const notify = useWorkspaceNotice();
	const isSandbox = mode === "sandbox";

	async function logout() {
		setOpen(false);
		try {
			if (!isSandbox) await endSession();
			await navigate(isSandbox ? "/" : signInPath, { replace: true });
		} catch (error) {
			notify(errorMessage(error));
		}
	}

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
						data-sandbox={isSandbox || undefined}
					/>
				}
				aria-label="Меню профиля"
			>
				<AvatarExtended className={styles.avatarWrapper}>
					<Avatar className={styles.avatar}>
						<GeneratedAvatar
							name={isSandbox ? "sandbox-guest" : user}
							variant="bot"
						>
							{isSandbox ? "Г" : user.slice(0, 2).toUpperCase()}
						</GeneratedAvatar>
					</Avatar>
				</AvatarExtended>
				<span className={styles.profileName}>
					<b>{isSandbox ? "Гость" : user}</b>
					<small>{isSandbox ? "Песочница" : "Оператор склада"}</small>
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
				<MenuItem
					onClick={() => {
						setOpen(false);
						void navigate(shipmentAdminPath(mode));
					}}
				>
					<IconShieldCog size={18} aria-hidden="true" />
					<span>Администрирование</span>
				</MenuItem>
				{isSandbox && user && (
					<MenuItem
						onClick={() => {
							setOpen(false);
							void navigate(accountEntryPath);
						}}
					>
						Мои склады
					</MenuItem>
				)}
				<MenuItem onClick={() => void logout()}>
					<IconLogout size={18} />
					<span>{isSandbox ? "Выйти из песочницы" : "Выйти"}</span>
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}
