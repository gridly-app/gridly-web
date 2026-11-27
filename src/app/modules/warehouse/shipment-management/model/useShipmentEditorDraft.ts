import { type FormEvent, useState } from "react";

import type { Actual, Milestone, Plan } from "@/domain/shipment";
import { errorMessage } from "@/shared/lib";

import type { WorkingShipment } from "../api/shipment.dto";
import {
	editableMilestones,
	shipmentDraft,
	type ShipmentPlanRow,
} from "./shipmentEditor";

export function useShipmentEditorDraft(
	shipment: WorkingShipment,
	save: (body: ReturnType<typeof shipmentDraft>) => Promise<void>,
) {
	const [source, setSource] = useState(shipment);
	const [priority, setPriority] = useState(shipment.warehouse.priority);
	const [reason, setReason] = useState(shipment.order.status_reason ?? "");
	const [plan, setPlan] = useState<ShipmentPlanRow[]>(() =>
		shipment.plan.map((entry) => ({ clientId: crypto.randomUUID(), entry })),
	);
	const [actual, setActual] = useState(shipment.actual);
	const [milestones, setMilestones] = useState(() =>
		editableMilestones(shipment),
	);
	const [error, setError] = useState("");
	const firstItem = shipment.items[0];

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError("");

		try {
			const planEntries = plan.map(({ entry }) => entry);
			const body = shipmentDraft(
				source,
				priority,
				reason,
				planEntries,
				actual,
				milestones,
			);

			void save(body);
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	function handlePriorityChange(value: string) {
		if (value === "none") setPriority(null);
		if (value === "low" || value === "normal" || value === "high")
			setPriority(value);
	}

	function handleReplaceDraft() {
		setSource(shipment);
		setPriority(shipment.warehouse.priority);
		setReason(shipment.order.status_reason ?? "");
		setPlan(
			shipment.plan.map((entry) => ({ clientId: crypto.randomUUID(), entry })),
		);
		setActual(shipment.actual);
		setMilestones(editableMilestones(shipment));
		setError("");
	}

	function handleEditPlan(clientId: string, patch: Partial<Plan>) {
		setPlan((rows) =>
			rows.map((row) =>
				row.clientId === clientId
					? { ...row, entry: { ...row.entry, ...patch } }
					: row,
			),
		);
	}

	function handleRemovePlan(clientId: string) {
		setPlan((rows) => rows.filter((row) => row.clientId !== clientId));
	}

	function handleAddPlan() {
		if (!firstItem) return;

		const row: ShipmentPlanRow = {
			clientId: crypto.randomUUID(),
			entry: {
				date: "",
				order_line_id: firstItem.order_line_id,
				quantity: 1,
				unit: firstItem.unit,
			},
		};

		setPlan((rows) => [...rows, row]);
	}

	function handleEditActual(id: string, patch: Partial<Actual>) {
		setActual((rows) =>
			rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
	}

	function handleRemoveActual(id: string) {
		setActual((rows) => rows.filter((row) => row.id !== id));
	}

	function handleAddActual() {
		if (!firstItem) return;

		const row: Actual = {
			id: crypto.randomUUID(),
			order_line_id: firstItem.order_line_id,
			unit: firstItem.unit,
			quantity: 1,
			shipped_at: "",
			loaded_at: null,
			transport_type: "road",
			packaging: firstItem.packaging,
			vehicle_number: null,
			reference_number: null,
			comment: null,
		};

		setActual((rows) => [...rows, row]);
	}

	function handleEditMilestone(
		code: Milestone["code"],
		patch: Partial<Milestone>,
	) {
		setMilestones((rows) =>
			rows.map((row) => (row.code === code ? { ...row, ...patch } : row)),
		);
	}

	return {
		source,
		priority,
		reason,
		plan,
		actual,
		milestones,
		error,
		setReason,
		handleSubmit,
		handlePriorityChange,
		handleReplaceDraft,
		handleEditPlan,
		handleRemovePlan,
		handleAddPlan,
		handleEditActual,
		handleRemoveActual,
		handleAddActual,
		handleEditMilestone,
	};
}
