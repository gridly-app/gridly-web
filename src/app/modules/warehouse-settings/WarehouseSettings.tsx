import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	type CommandExecutor,
	type Warehouse,
	warehouseCommandSchema,
} from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import {
	DeleteWarehouseDialog,
	useWarehouse,
	useWarehouseCache,
	useWarehouseCommand,
	useWarehouseResources,
} from "@/ports/warehouse";
import { errorMessage, UserError } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { ScrollArea } from "@/shared/ui/navigation";
import { useSettingsPage } from "./model/useSettingsPage";
import type { SettingsWarehouse } from "./model/warehouseFields";
import { CabinetSettings } from "./ui/CabinetSettings";
import { SettingsForm } from "./ui/SettingsForm";
import styles from "./WarehouseSettings.module.css";

export function WarehouseSettings({
	warehouse: selectedWarehouse,
}: {
	warehouse?: Warehouse;
} = {}) {
	if (selectedWarehouse) {
		return <EmbeddedSettingsPage warehouse={selectedWarehouse} />;
	}
	return <RouteSettingsPage />;
}

function RouteSettingsPage() {
	const { getWarehouses, getSnapshot } = useWarehouseCache();
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(
		null,
	);
	const {
		warehouse,
		execute,
		pending,
		settingsError,
		retrySettings,
		settingsLoading,
	} = useSettingsPage();
	const deleteSnapshot = getSnapshot(warehouse.id);

	return (
		<SettingsContent
			warehouse={warehouse}
			execute={execute}
			pending={pending}
			settingsError={settingsError}
			retrySettings={retrySettings}
			settingsLoading={settingsLoading}
			deleteAction={
				<>
					<Button
						variant="destructive-outline"
						disabled={
							pending ||
							!deleteSnapshot ||
							warehouse.revision === undefined ||
							!warehouse.allowedActions?.includes("delete")
						}
						onClick={() => setWarehouseToDelete(warehouse.id)}
					>
						Удалить склад
					</Button>
					{warehouseToDelete === warehouse.id && deleteSnapshot && (
						<DeleteWarehouseDialog
							warehouse={deleteSnapshot}
							onCancel={() => setWarehouseToDelete(null)}
							onDeleted={() => {
								setWarehouseToDelete(null);
								const next = getWarehouses()?.find(
									(item) => item.id !== warehouse.id,
								);
								void navigate(warehousePath(mode, next?.id ?? "new"), {
									replace: true,
								});
							}}
						/>
					)}
				</>
			}
		/>
	);
}

function EmbeddedSettingsPage({ warehouse }: { warehouse: Warehouse }) {
	const metadata = useWarehouse(warehouse.id);
	const resources = useWarehouseResources(metadata.data ?? warehouse, [
		"settings",
	]);
	const mutation = useWarehouseCommand(warehouse.id);
	const execute: CommandExecutor = async (action, ...[value, intent]) => {
		if (!navigator.onLine || resources.error || metadata.isError) {
			throw new UserError("Дождитесь синхронизации склада");
		}
		return mutation.mutateAsync({
			...warehouseCommandSchema.parse({ action, value }),
			operationId: intent?.operationId,
		});
	};
	return (
		<SettingsContent
			warehouse={resources.warehouse}
			execute={execute}
			pending={mutation.isPending || !!resources.error || metadata.isError}
			settingsError={resources.error}
			retrySettings={() => resources.retry()}
			settingsLoading={resources.loading}
		/>
	);
}

function SettingsContent({
	warehouse,
	execute,
	pending,
	settingsError,
	retrySettings,
	settingsLoading,
	deleteAction,
}: {
	warehouse: SettingsWarehouse;
	execute: CommandExecutor;
	pending: boolean;
	settingsError: Error | null | undefined;
	retrySettings: () => Promise<unknown>;
	settingsLoading: boolean;
	deleteAction?: React.ReactNode;
}) {
	const props = {
		w: warehouse,
		execute,
		pending,
		settingsError,
		retrySettings,
		settingsLoading,
	};
	return (
		<ScrollArea className={styles.pageScroll}>
			<div className={styles.settings}>
				<header className={styles.heading}>
					<div>
						<h2>Настройки склада</h2>
						<p>{warehouse.name}</p>
					</div>
					{deleteAction}
				</header>
				{settingsLoading && (
					<Feedback tone="loading">Загружаем настройки…</Feedback>
				)}
				{settingsError && (
					<Feedback
						tone="error"
						action={<RetryButton onRetry={retrySettings} />}
					>
						Не удалось загрузить настройки города и порога остатка.{" "}
						{errorMessage(settingsError)}
					</Feedback>
				)}
				<div className={styles.settingsGrid} key={warehouse.id}>
					<SettingsForm section="general" {...props} />
					<SettingsForm section="confirmations" {...props} />
					<CabinetSettings {...props} />
				</div>
			</div>
		</ScrollArea>
	);
}
