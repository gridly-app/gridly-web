import { useNetwork } from "../spaceui/use-network";
export function useOnlineStatus() {
	return useNetwork().isOnline;
}
