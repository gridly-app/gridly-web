import { createContext } from "react";

export const sidebarContext = createContext({
	open: true,
	mobile: false,
	toggleSidebar: () => {},
});
