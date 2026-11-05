import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
	type CommandExecutor,
	confirmationLabels,
	type Warehouse,
	warehouseKeys,
	workflowKeys,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";

export interface SettingsFormOptions {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}

export function useSettingsForm({ w, execute, pending }: SettingsFormOptions) {
	const cache = useQueryClient();
	const [draft, setDraft] = useState(() => ({
		name: w.name,
		baselineName: w.name,
		policy: { ...w.policy },
		revision: w.revision,
		policyRevision: w.policyRevision,
	}));
	const [operation, setOperation] = useState<"name" | "policy" | null>(null);
	const inFlight = useRef(false);
	const [messages, setMessages] = useState<
		Partial<
			Record<
				"name" | "policy",
				{ text: string; tone: "success" | "error" } | undefined
			>
		>
	>({});
	async function save(section: "name" | "policy") {
		if (pending || inFlight.current) return;
		inFlight.current = true;
		setOperation(section);
		setMessages((current) => ({ ...current, [section]: undefined }));
		try {
			await execute(
				"settings",
				section === "name"
					? {
							section,
							name: draft.name.trim(),
							revision:
								w.name === draft.baselineName ? w.revision : draft.revision,
						}
					: {
							section,
							policy: draft.policy,
							policyRevision: draft.policyRevision,
						},
			);
			const updated = cache.getQueryData<Warehouse>(warehouseKeys.detail(w.id));
			if (updated)
				setDraft((current) =>
					section === "name"
						? {
								...current,
								revision: updated.revision,
								baselineName: updated.name,
							}
						: { ...current, policyRevision: updated.policyRevision },
				);
			setMessages((current) => ({
				...current,
				[section]: { text: "Сохранено", tone: "success" },
			}));
		} catch (error) {
			setMessages((current) => ({
				...current,
				[section]: { text: errorMessage(error), tone: "error" },
			}));
		} finally {
			inFlight.current = false;
			setOperation(null);
		}
	}
	function refresh(section: "name" | "policy") {
		setDraft((current) =>
			section === "name"
				? {
						...current,
						name: w.name,
						baselineName: w.name,
						revision: w.revision,
					}
				: {
						...current,
						policy: { ...w.policy },
						policyRevision: w.policyRevision,
					},
		);
		setMessages((current) => ({ ...current, [section]: undefined }));
	}
	return {
		w,
		name: draft.name,
		changeName: (name: string) => setDraft((current) => ({ ...current, name })),
		confirmations: workflowKeys.map((key, index) => ({
			key,
			label: confirmationLabels[index],
			checked: draft.policy[key],
		})),
		updatePolicy: (key: (typeof workflowKeys)[number], checked: boolean) =>
			setDraft((current) => ({
				...current,
				policy: { ...current.policy, [key]: checked },
			})),
		save,
		refresh,
		messages,
		pending: pending || operation !== null,
		nameChanged: draft.name.trim() !== w.name,
		policyChanged: JSON.stringify(draft.policy) !== JSON.stringify(w.policy),
	};
}
