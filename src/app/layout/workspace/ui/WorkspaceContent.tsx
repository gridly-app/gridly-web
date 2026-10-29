import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useWorkspaceMode } from "@/shared/auth";
import { Button, Feedback } from "@/shared/ui";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import { ConnectionStatus } from "./ConnectionStatus";
import { WorkspaceResources } from "./WorkspaceResources";
import workspaceStyles from "./WorkspaceShell.module.css";

export interface WorkspaceContentProps {
	model: WorkspaceShellModel["content"];
}

export function WorkspaceContent({ model }: WorkspaceContentProps) {
	const isDemo = useWorkspaceMode() === "demo";
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
				{isDemo && (
					<aside className={workspaceStyles.demoNotice} aria-label="Демо-режим">
						<strong>Демо-режим</strong>
						<span>Учебные данные. Изменения не затрагивают ваши склады.</span>
					</aside>
				)}
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
