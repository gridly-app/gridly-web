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

	if (command.value.timezone !== warehouse.timezone) {
		throw new Error(
			"API не определяет изменение часового пояса существующего склада",
		);
	}
	await send(
		"",
		{
			revision: requireRevision(command.value.revision ?? warehouse.revision),
			name: command.value.name,
		},
		"PATCH",
	);
	await send(
		"/workflow-policy",
		{
			revision: command.value.policyRevision ?? warehouse.policyRevision,
			...policyToDto(command.value.policy),
		},
		"PATCH",
	);
}
