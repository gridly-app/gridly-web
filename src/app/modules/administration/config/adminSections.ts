import {
	IconActivity,
	IconBuildingWarehouse,
	IconClipboardList,
	IconHistory,
	IconLink,
	IconUsers,
} from "@tabler/icons-react";

export const defaultAdminSection = {
	id: "audit",
	label: "Журнал аудита",
	icon: IconHistory,
} as const;

export const adminSectionGroups = [
	{
		id: "operations",
		label: "Операции",
		items: [
			{ id: "warehouses", label: "Склады", icon: IconBuildingWarehouse },
			{ id: "orders", label: "Заказы", icon: IconClipboardList },
		],
	},
	{
		id: "access",
		label: "Доступ",
		items: [
			{ id: "users", label: "Пользователи", icon: IconUsers },
			{ id: "links", label: "Гостевые ссылки", icon: IconLink },
		],
	},
	{
		id: "monitoring",
		label: "Мониторинг",
		items: [
			defaultAdminSection,
			{ id: "system", label: "Состояние системы", icon: IconActivity },
		],
	},
] as const;

type AdminSection = (typeof adminSectionGroups)[number]["items"][number];

export const adminSections: readonly AdminSection[] =
	adminSectionGroups.flatMap<AdminSection>((group) => group.items);
