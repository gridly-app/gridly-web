import { useState } from "react";

export interface ProfileMenuOptions {
	isDemo: boolean;
	user: string;
	dark: boolean;
	setDark: (dark: boolean) => void;
	logout: () => void;
}

export function useProfileMenu({
	user,
	dark,
	setDark,
	logout,
}: ProfileMenuOptions) {
	const [open, setOpen] = useState(false);

	function selectTheme(dark: boolean) {
		setDark(dark);
		setOpen(false);
	}

	return { open, setOpen, user, selectTheme, dark, logout };
}
