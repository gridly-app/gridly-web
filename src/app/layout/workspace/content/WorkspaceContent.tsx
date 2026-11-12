import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { SidebarTrigger } from "@/shared/ui/navigation";
import type { WorkspaceShellModel } from "../useWorkspaceShell";
import styles from "./WorkspaceContent.module.css";
import { WorkspaceResources } from "./WorkspaceResources";

export interface WorkspaceContentProps {
	model: WorkspaceShellModel["content"];
}

export function WorkspaceContent({ model }: WorkspaceContentProps) {
	const {
		warehouse,
		warehouseId,
		openCreation,
		snapshot,
		retrySnapshot,
		scope,
	} = model;

	return (
		<main className={styles.workspaceMain}>
			<header className={styles.mobileHeader}>
				<SidebarTrigger aria-label="Открыть меню" />
				<span>Gridly</span>
			</header>
			<div className={styles.content} data-page={model.page}>
				{warehouseId === "new" ? (
					<Button variant="default" onClick={openCreation}>
						Создать первый склад
					</Button>
				) : snapshot.isPending ? (
					<Feedback tone="loading" fill>
						Загружаем состояние склада…
					</Feedback>
				) : snapshot.isError && !warehouse ? (
					<Feedback
						inset
						tone="error"
						fill
						title="Не удалось загрузить склад"
						action={
							<RetryButton
								variant="secondary"
								size="sm"
								onRetry={retrySnapshot}
							/>
						}
					>
						{errorMessage(snapshot.error)}
					</Feedback>
				) : (
					scope && (
						<WorkspaceResources key={warehouseId} scope={scope}>
							<Suspense
								fallback={
									<Feedback tone="loading" fill role="status">
										Загружаем раздел…
									</Feedback>
								}
							>
								<Outlet key={warehouseId} />
							</Suspense>
						</WorkspaceResources>
					)
				)}
			</div>
		</main>
	);
}
