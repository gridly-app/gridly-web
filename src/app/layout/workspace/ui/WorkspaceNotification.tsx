import { useEffect, useRef } from "react";
import { toastManager } from "@/shared/ui/spaceui/toast";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
export interface WorkspaceNotificationProps {
	model: WorkspaceShellModel["notice"];
}
export function WorkspaceNotification({ model }: WorkspaceNotificationProps) {
	const { message, dismiss } = model;
	const dismissRef = useRef(dismiss);
	dismissRef.current = dismiss;
	useEffect(() => {
		if (!message) return;
		let active = true;
		const id = toastManager.add({
			description: message,
			timeout: 6000,
			onClose: () => {
				if (active) dismissRef.current();
			},
		});
		return () => {
			active = false;
			toastManager.close(id);
		};
	}, [message]);
	return null;
}
