import { useRef, useState } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import { blocksLayoutWrite, useLayoutOperation } from "@/ports/warehouse";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import type { SettingsWarehouse } from "../../model/warehouseFields";
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
	const inFlight = useRef(false);
	const busy = pending || saving !== null;
	const layout = useLayoutOperation(warehouse.id);
	const layoutBlocked = blocksLayoutWrite(layout.operation);
	const layoutRefreshFailed = layout.operation?.status === "refresh-failed";

	async function save(
		section: "city" | "map",
		command: () => Promise<unknown>,
	) {
		if (inFlight.current || busy) return false;
		inFlight.current = true;
		setSaving(section);
		try {
			await command();
			return true;
		} finally {
			setSaving(null);
			inFlight.current = false;
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
				canResize={
					!layoutBlocked &&
					warehouse.draftRevision === undefined &&
					!!warehouse.allowedActions?.includes("resize")
				}
				busy={busy}
				saving={saving === "map"}
				saveDimensions={(value) => save("map", () => execute("resize", value))}
			/>
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
