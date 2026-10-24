import { useState } from "react";
import {
	useWarehouseScope,
	type WarehouseSettings,
} from "@/entities/warehouse";

export function useSettingsPage() {
	const { warehouse, execute, pending } = useWarehouseScope();
	const [formWarehouse, setFormWarehouse] = useState(warehouse);
	const [savedVersion, setSavedVersion] = useState(0);

	async function saveSettings(value: WarehouseSettings) {
		const saved = await execute("settings", value);

		setFormWarehouse(saved);
		setSavedVersion((version) => version + 1);
	}

	return { warehouse: formWarehouse, pending, saveSettings, savedVersion };
}
