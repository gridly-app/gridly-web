import type { WarehouseCommand } from "../../model/commands/commands";
import { policyToDto } from "../contracts/contractMappers";
import type { RestCommandContext } from "./context";
import { requireRevision } from "./context";

export async function setSimulation(
	context: RestCommandContext,
	_command: Extract<WarehouseCommand, { action: "simulation" }>,
): Promise<void> {
	const { warehouse, send } = context;

	await send(
		`/simulation/${warehouse.running ? "pause" : "resume"}`,
		undefined,
		"POST",
		false,
	);
}

export async function saveSettings(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "settings" }>,
): Promise<void> {
	const { warehouse, send } = context;

	if (command.value.section === "name") {
		if (command.value.name === warehouse.name) return;
		await send(
			"",
			{
				revision: requireRevision(command.value.revision ?? warehouse.revision),
				name: command.value.name,
			},
			"PATCH",
		);
	} else {
		if (
			JSON.stringify(command.value.policy) === JSON.stringify(warehouse.policy)
		)
			return;
		await send(
			"/workflow-policy",
			{
				revision: requireRevision(
					command.value.policyRevision ?? warehouse.policyRevision,
				),
				...policyToDto(command.value.policy),
			},
			"PATCH",
		);
	}
}
