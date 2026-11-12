import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import styles from "./SettingsPage.module.css";
import { WarehouseCityForm } from "./WarehouseCityForm";
import { WarehouseDimensionsForm } from "./WarehouseDimensionsForm";

export function LocationAndMapSettings({
	w,
	execute,
	pending,
}: {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const [saving, setSaving] = useState<"city" | "map" | null>(null);
	const inFlight = useRef(false);
	const busy = pending || saving !== null;

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
				canResize={!!w.allowedActions?.includes("resize")}
				busy={busy}
				saving={saving === "map"}
				saveDimensions={(value) => save("map", () => execute("resize", value))}
			/>
		</div>
	);
}
