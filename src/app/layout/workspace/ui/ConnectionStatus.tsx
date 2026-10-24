import {
	useWarehouseLiveSelection,
	type Warehouse,
	type WarehouseLiveState,
} from "@/entities/warehouse";
import type { WorkspaceShellModel } from "../model/useWorkspaceShell";
import workspaceStyles from "./WorkspaceShell.module.css";

export interface ConnectionStatusProps {
	model: Pick<WorkspaceShellModel["content"], "stale" | "snapshot"> & {
		warehouse: Warehouse;
	};
}

const workerLabels: Record<string, string> = {
	healthy: "доступен",
	available: "доступен",
	delayed: "задерживается",
	unavailable: "нет связи",
};

const selectConnection = (warehouse: Warehouse, live?: WarehouseLiveState) => ({
	running: live?.running ?? warehouse.running,
});

export function ConnectionStatus({ model }: ConnectionStatusProps) {
	const { warehouse: original, stale: snapshotStale, snapshot } = model;
	const live = useWarehouseLiveSelection(original, selectConnection);
	const warehouse = { ...original, ...live.data };
	const stale = snapshotStale || live.isError;

	if (!warehouse.workerHealth && !stale) {
		return null;
	}

	return (
		<div className={workspaceStyles["connection-status"]} role="status">
			<span>Симуляция: {warehouse.running ? "включена" : "на паузе"}</span>
			{warehouse.workerHealth && (
				<span>
					Исполнитель:{" "}
					{workerLabels[warehouse.workerHealth] || warehouse.workerHealth}
				</span>
			)}
			<span>
				Последнее обновление:{" "}
				{new Date(
					Math.max(snapshot.dataUpdatedAt, live.dataUpdatedAt),
				).toLocaleTimeString("ru-RU")}
			</span>
			{stale && <strong>Нет соединения, данные могут быть устаревшими</strong>}
			{warehouse.lastTickAt && (
				<span>
					Последний тик:{" "}
					{new Date(warehouse.lastTickAt).toLocaleTimeString("ru-RU")}
				</span>
			)}
		</div>
	);
}
