import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { WarehouseScopeProvider } from "@/entities/warehouse";
import { Button, Feedback } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import { ConnectionStatus } from "./ConnectionStatus";
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
			<div className={workspaceStyles.content}>
				{warehouse && <ConnectionStatus model={{ ...model, warehouse }} />}
				{warehouseId === "new" ? (
					<Button variant="default" onClick={openCreation}>
						Создать первый склад
					</Button>
				) : snapshot.isPending ? (
					<Feedback tone="loading" fill>
						Загружаем состояние склада…
					</Feedback>
				) : snapshot.isError && !warehouse ? (
					<Feedback tone="error" fill role="alert">
						{snapshot.error?.message || "Не удалось синхронизировать склад"}
						<Button variant="ghost" onClick={retrySnapshot}>
							Повторить
						</Button>
					</Feedback>
				) : (
					scope && (
						<WarehouseScopeProvider value={scope}>
							<Suspense
								fallback={
									<Feedback tone="loading" fill role="status">
										Загружаем раздел…
									</Feedback>
								}
							>
								<Outlet key={warehouseId} />
							</Suspense>
						</WarehouseScopeProvider>
					)
				)}
			</div>
		</main>
	);
}
