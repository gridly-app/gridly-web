import { useRef, useState } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import { blocksLayoutWrite, useLayoutOperation } from "@/ports/warehouse";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import type { SettingsWarehouse } from "../model/warehouseFields";
import styles from "../WarehouseSettings.module.css";
import { WarehouseCityForm } from "./WarehouseCityForm";
import { WarehouseDimensionsForm } from "./WarehouseDimensionsForm";

export function LocationAndMapSettings({
	w,
	execute,
	pending,
}: {
	w: SettingsWarehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const [saving, setSaving] = useState<"city" | "map" | null>(null);
	const inFlight = useRef(false);
	const busy = pending || saving !== null;
	const layout = useLayoutOperation(w.id);
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
				settings={w.settings}
				canEdit={!!w.settings && !!w.allowedActions?.includes("edit-settings")}
				busy={busy}
				saving={saving === "city"}
				saveCity={(value) =>
					save("city", () => execute("warehouseSettings", value))
				}
			/>
			<WarehouseDimensionsForm
				savedWidth={w.width}
				savedHeight={w.height}
				canResize={
					!layoutBlocked &&
					w.draftRevision === undefined &&
					!!w.allowedActions?.includes("resize")
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
