import type { CommandHandlers } from "./commandHandlers";

export const settingsHandlers: Pick<CommandHandlers, "settings"> = {
	settings(warehouse, value) {
		warehouse.name = value.name;
		warehouse.timezone = value.timezone;
		warehouse.policy = value.policy;
	},
};
