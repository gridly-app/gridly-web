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
import { ApiError } from "@/shared/http";
import { errorMessage, UserError } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { ScrollArea } from "@/shared/ui/navigation";
import { useSettingsPage } from "./model/useSettingsPage";
import type { SettingsWarehouse } from "./model/warehouseFields";
import { CabinetSettings } from "./ui/CabinetSettings/CabinetSettings";
import { SettingsForm } from "./ui/SettingsForm/SettingsForm";
import styles from "./shared.module.css";

export function WarehouseSettings({
	warehouse: selectedWarehouse,
	workspace = false,
}: {
	warehouse: Warehouse;
	workspace?: boolean;
}) {
	if (workspace) return <RouteSettingsPage />;

	return <EmbeddedSettingsPage warehouse={selectedWarehouse} />;
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

	if (settingsError instanceof ApiError && settingsError.status === 403) {
		return <Feedback tone="error">{errorMessage(settingsError)}</Feedback>;
	}

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

	const error = metadata.error ?? resources.error;
	const accessLost =
		error instanceof ApiError &&
		(error.status === 403 ||
			(error.status === 404 && error === metadata.error));

	if (accessLost)
		return <Feedback tone="error">{errorMessage(error)}</Feedback>;

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
				{deleteAction && <div className={styles.heading}>{deleteAction}</div>}
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
