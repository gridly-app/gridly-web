import { useState } from "react";
import {
	confirmationLabels,
	type WorkflowKey,
	workflowKeys,
} from "@/domain/warehouse";
import { useWarehouseCache } from "@/ports/warehouse";
import type { SettingsCommandOptions } from "./useNameSettings";
import { useSettingsSave } from "./useSettingsSave";

export function usePolicySettings({
	warehouse,
	execute,
	pending,
}: SettingsCommandOptions) {
	const { getSnapshot } = useWarehouseCache();
	const saving = useSettingsSave(pending);
	const [policy, setPolicy] = useState(() => ({ ...warehouse.policy }));
	const [policyRevision, setPolicyRevision] = useState(
		warehouse.policyRevision,
	);
	const confirmations = workflowKeys.map((key) => ({
		key,
		label: confirmationLabels[key],
		checked: policy[key],
	}));
	const isChanged = workflowKeys.some(
		(key) => policy[key] !== warehouse.policy[key],
	);

	async function write() {
		await execute("settings", { section: "policy", policy, policyRevision });

		const updated = getSnapshot(warehouse.id);

		if (updated) setPolicyRevision(updated.policyRevision);
	}

	function save() {
		return saving.save(write);
	}

	function refresh() {
		setPolicy({ ...warehouse.policy });
		setPolicyRevision(warehouse.policyRevision);
		saving.clearMessage();
	}

	function updatePolicy(key: WorkflowKey, checked: boolean) {
		setPolicy((current) => ({ ...current, [key]: checked }));
	}

	return {
		confirmations,
		updatePolicy,
		isChanged,
		isBusy: saving.isBusy,
		message: saving.message,
		save,
		refresh,
	};
}
