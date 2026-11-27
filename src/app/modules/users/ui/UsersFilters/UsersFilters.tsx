import { guestLinkStatuses } from "@/domain/shipment";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import { userKinds } from "../../config/accessLabels";
import { defaultUserFilters, type UserFilters } from "../../model/userFilters";

const kindLabels = {
	account: "Аккаунты",
	guest: userKinds.guest,
} satisfies Record<keyof typeof userKinds, string>;

const kindOptions = [
	{ value: "all", label: "Все пользователи" },
	...Object.entries(kindLabels).map(([value, label]) => ({ value, label })),
];

const statusOptions = [
	{ value: "all", label: "Любое состояние ссылки" },
	...Object.entries(guestLinkStatuses).map(([value, label]) => ({
		value,
		label,
	})),
];

export function UsersFilters({
	filters,
	locations,
	onChange,
}: {
	filters: UserFilters;
	locations: { value: string; label: string }[];
	onChange: (filters: UserFilters) => void;
}) {
	const { search, kind, warehouse, status } = filters;
	const count =
		Number(kind !== "all") +
		Number(warehouse !== "all") +
		Number(status !== "all");
	const warehouseOptions = [
		{ value: "all", label: "Все склады" },
		...locations,
	];
	const searchField = {
		"aria-label": "Поиск по пользователям",
		value: search,
		onChange: handleSearch,
	};

	function handleSearch(search: string) {
		onChange({ ...filters, search });
	}

	function handleReset() {
		onChange({ ...defaultUserFilters, search });
	}

	function handleKind(kind: string) {
		if (kind === "all" || isOption(kind, kindLabels))
			onChange({ ...filters, kind });
	}

	function handleWarehouse(warehouse: string) {
		onChange({ ...filters, warehouse });
	}

	function handleStatus(status: string) {
		if (status === "all" || isOption(status, guestLinkStatuses))
			onChange({ ...filters, status });
	}

	return (
		<ListFilters search={searchField} count={count} onReset={handleReset}>
			<Select
				aria-label="Тип доступа"
				value={kind}
				onValueChange={handleKind}
				options={kindOptions}
			/>
			<Select
				aria-label="Склад"
				value={warehouse}
				onValueChange={handleWarehouse}
				options={warehouseOptions}
			/>
			<Select
				aria-label="Состояние гостевой ссылки"
				value={status}
				onValueChange={handleStatus}
				options={statusOptions}
			/>
		</ListFilters>
	);
}

function isOption<Options extends Record<string, string>>(
	value: string,
	options: Options,
): value is Extract<keyof Options, string> {
	return Object.hasOwn(options, value);
}
