import { useState } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import {
	blocksLayoutWrite,
	useLayoutOperation,
	useWarehouseResources,
} from "@/ports/warehouse";
import { useSingleFlight } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import type { SettingsWarehouse } from "../../model/warehouseResources";
import styles from "../../shared.module.css";
import { WarehouseCityForm } from "../WarehouseCityForm/WarehouseCityForm";
import { WarehouseDimensionsForm } from "../WarehouseDimensionsForm/WarehouseDimensionsForm";

export function LocationAndMapSettings({
	warehouse,
	execute,
	pending,
	retrySettings,
}: {
	warehouse: SettingsWarehouse;
	execute: CommandExecutor;
	pending: boolean;
	retrySettings: () => Promise<unknown>;
}) {
	const [saving, setSaving] = useState<"city" | "map" | null>(null);
	const flight = useSingleFlight();
	const busy = pending || flight.isRunning;
	const layout = useLayoutOperation(warehouse.id);
	const layoutResource = useWarehouseResources(warehouse, ["map"]);
	const hasNoDraft =
		!layoutResource.error &&
		layoutResource.data?.version === warehouse.version &&
		layoutResource.data.draftRevision === undefined;
	const layoutBlocked = blocksLayoutWrite(layout.operation);
	const layoutRefreshFailed = layout.operation?.status === "refresh-failed";
	const mayResize = !!warehouse.allowedActions?.includes("resize");
	const layoutReadFailed =
		mayResize && !layoutRefreshFailed && Boolean(layoutResource.error);
	const canResize = mayResize && hasNoDraft && !layoutBlocked;

	async function save(
		section: "city" | "map",
		command: () => Promise<unknown>,
	) {
		if (busy) return false;

		setSaving(section);

		try {
			const isSaved = await flight.run(async () => {
				await command();

				return true;
			});

			return isSaved ?? false;
		} finally {
			setSaving(null);
		}
	}

	return (
		<div className={styles.locationAndMap}>
			<WarehouseCityForm
				settings={warehouse.settings}
				retrySettings={retrySettings}
				canEdit={
					!!warehouse.settings &&
					!!warehouse.allowedActions?.includes("edit-settings")
				}
				busy={busy}
				saving={saving === "city"}
				saveCity={(value) =>
					save("city", () => execute("warehouseSettings", value))
				}
			/>
			<WarehouseDimensionsForm
				savedWidth={warehouse.width}
				savedHeight={warehouse.height}
				canResize={canResize}
				busy={busy}
				saving={saving === "map"}
				saveDimensions={(value) => save("map", () => execute("resize", value))}
			/>
			{layoutReadFailed && (
				<Feedback
					tone="warning"
					action={<RetryButton onRetry={layoutResource.retry} />}
				>
					Не удалось загрузить актуальную планировку. Изменение размеров пока
					недоступно.
				</Feedback>
			)}
			{layout.operation?.status === "unknown" && (
				<Feedback tone="warning">
					Исход записи планировки неизвестен. Отправленный снимок сохранён для
					этой сессии.
				</Feedback>
			)}
			{layoutRefreshFailed && (
				<Feedback
					tone="warning"
					action={<RetryButton onRetry={layout.retryRead} />}
				>
					Запись выполнена. Не удалось загрузить актуальную планировку.
				</Feedback>
			)}
		</div>
	);
}
