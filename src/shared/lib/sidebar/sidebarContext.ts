import { createContext } from "react";

export const sidebarContext = createContext<{
	open: boolean;
	mobile: boolean;
	toggleSidebar: () => void;
}>({
	open: true,
	mobile: false,
	toggleSidebar: () => undefined,
});
