import type { CommandHandlers } from "./commandHandlers";

export type { CommandHandler, CommandHandlers } from "./commandHandlers";

import { catalogHandlers } from "./catalog";
import { inventoryHandlers } from "./inventory";
import { layoutHandlers } from "./layout";
import { orderHandlers } from "./orders";
import { robotHandlers } from "./robots";
import { settingsHandlers } from "./settings";

export const commandHandlers = {
	...layoutHandlers,
	...catalogHandlers,
	...robotHandlers,
	...orderHandlers,
	...inventoryHandlers,
	...settingsHandlers,
} satisfies CommandHandlers;
