import { Button } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import workspaceStyles from "./WorkspaceShell.module.css";

export interface WorkspaceNotificationProps {
	model: WorkspaceShellModel["notice"];
}

export function WorkspaceNotification({ model }: WorkspaceNotificationProps) {
	const { message, dismiss } = model;

	return (
		<>
			{message && (
				<div role="status" className={workspaceStyles.toast}>
					{message}
					<Button
						className={workspaceStyles.toastClose}
						variant="ghost"
						aria-label="Закрыть уведомление"
						onClick={dismiss}
					>
						×
					</Button>
				</div>
			)}
		</>
	);
}
