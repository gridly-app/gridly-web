import {
	IconArrowDownLeft,
	IconArrowUpRight,
	IconHistory,
	IconLayoutGrid,
	IconPackage,
	IconRobot,
	IconSettings,
	IconStack2,
} from "@tabler/icons-react";

export const navigation = [
	["map", "Карта склада", IconLayoutGrid],
	["robots", "Роботы", IconRobot],
	["catalog", "Каталог", IconPackage],
	["inbound", "Поставки", IconArrowDownLeft],
	["outbound", "Отгрузки", IconArrowUpRight],
	["inventory", "Остатки", IconStack2],
	["history", "История", IconHistory],
	["settings", "Настройки", IconSettings],
] as const;
