import { useState } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import { useWarehouseCache } from "@/ports/warehouse";
import type { SettingsWarehouse } from "./warehouseResources";
import { useSettingsSave } from "./useSettingsSave";

export interface SettingsCommandOptions {
	warehouse: SettingsWarehouse;
	execute: CommandExecutor;
	pending: boolean;
}

export function useNameSettings({
	warehouse,
	execute,
	pending,
}: SettingsCommandOptions) {
	const { getSnapshot } = useWarehouseCache();
	const saving = useSettingsSave(pending);
	const [name, setName] = useState(warehouse.name);
	const [baseline, setBaseline] = useState({
		name: warehouse.name,
		revision: warehouse.revision,
	});

	async function write() {
		const isNameUnchangedOnServer = warehouse.name === baseline.name;
		const revision = isNameUnchangedOnServer
			? warehouse.revision
			: baseline.revision;

		await execute("settings", { section: "name", name: name.trim(), revision });

		const updated = getSnapshot(warehouse.id);

		if (updated)
			setBaseline({ name: updated.name, revision: updated.revision });
	}

	function save() {
		return saving.save(write);
	}

	function refresh() {
		setName(warehouse.name);
		setBaseline({ name: warehouse.name, revision: warehouse.revision });
		saving.clearMessage();
	}

	return {
		name,
		changeName: setName,
		isChanged: name.trim() !== warehouse.name,
		isBusy: saving.isBusy,
		message: saving.message,
		save,
		refresh,
	};
}
