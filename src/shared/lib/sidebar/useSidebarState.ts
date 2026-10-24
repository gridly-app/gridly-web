import { useEffect, useState } from "react";

export function useSidebarState() {
	const [desktopOpen, setDesktopOpen] = useState(
		() => localStorage.getItem("gridly.sidebar") !== "false",
	);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [mobile, setMobile] = useState(
		() => window.matchMedia("(max-width: 850px)").matches,
	);
	const open = mobile ? mobileOpen : desktopOpen;
	function toggleSidebar() {
		if (mobile) setMobileOpen((current) => !current);
		else setDesktopOpen((current) => !current);
	}

	useEffect(() => {
		localStorage.setItem("gridly.sidebar", String(desktopOpen));
	}, [desktopOpen]);

	useEffect(() => {
		const query = window.matchMedia("(max-width: 850px)");
		function resize() {
			setMobile(query.matches);
		}
		query.addEventListener("change", resize);
		resize();
		return () => query.removeEventListener("change", resize);
	}, []);

	useEffect(() => {
		function shortcut(event: KeyboardEvent) {
			if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				if (mobile) setMobileOpen((current) => !current);
				else setDesktopOpen((current) => !current);
			}
		}
		window.addEventListener("keydown", shortcut);
		return () => {
			window.removeEventListener("keydown", shortcut);
		};
	}, [mobile]);

	return { open, mobile, toggleSidebar };
}
