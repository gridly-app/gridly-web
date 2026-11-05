import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Button, Feedback, SidebarTrigger } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import { WorkspaceResources } from "./WorkspaceResources";
import workspaceStyles from "./WorkspaceShell.module.css";

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
		<main className={workspaceStyles.workspaceMain}>
			<header className="flex items-center gap-3 border-b p-3 min-[851px]:hidden">
				<SidebarTrigger aria-label="Открыть меню" />
				<span>Gridly</span>
			</header>
			<div className={workspaceStyles.content} data-page={model.page}>
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
						className="workspace-alert"
						tone="error"
						fill
						title="Не удалось загрузить склад"
						action={
							<Button variant="secondary" size="sm" onClick={retrySnapshot}>
								Повторить
							</Button>
						}
					>
						{snapshot.error?.message || "Не удалось синхронизировать склад"}
					</Feedback>
				) : (
					scope && (
						<WorkspaceResources
							key={warehouseId}
							scope={scope}
							page={model.page}
						>
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
