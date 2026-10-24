import { useState } from "react";
import type { Warehouse, WarehouseSettings } from "@/entities/warehouse";
import { confirmationLabels } from "@/entities/warehouse";
import { errorMessage, formText } from "@/shared/lib";

export interface SettingsFormOptions {
	w: Warehouse;
	save: (v: WarehouseSettings) => Promise<void>;
	pending: boolean;
}

export function useSettingsForm({
	w: warehouse,
	save,
	pending,
}: SettingsFormOptions) {
	const [policy, setPolicy] = useState(warehouse.policy);
	const [revision] = useState(warehouse.revision);
	const [policyRevision] = useState(warehouse.policyRevision);

	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);

	function updatePolicy(index: number, checked: boolean) {
		setPolicy((current) =>
			current.map((value, stageIndex) =>
				index === stageIndex ? checked : value,
			),
		);
	}

	async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || submitting) {
			return;
		}
		const data = new FormData(event.currentTarget);

		setError("");
		setSubmitting(true);
		try {
			await save({
				revision,
				policyRevision,
				name: formText(data, "name"),
				timezone: formText(data, "timezone"),
				policy,
			});
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setSubmitting(false);
		}
	}

	const confirmations = policy.map((checked, index) => ({
		checked,
		label: confirmationLabels[index],
		index,
	}));

	return {
		confirmations,
		handleSubmit,
		w: warehouse,
		updatePolicy,
		error,
		pending: pending || submitting,
	};
}
