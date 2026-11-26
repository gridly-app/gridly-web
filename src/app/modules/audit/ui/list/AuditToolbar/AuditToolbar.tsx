import type { ChangeEvent } from "react";

import { auditAreaLabels } from "../../../model/events/auditArea";
import {
	type AuditFilters,
	defaultAuditFilters,
} from "../../../model/filters/auditFilters";

import { Button, Input } from "@/shared/ui/controls";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Field, Select } from "@/shared/ui/forms";

import { managementStyles as styles } from "@/shared/ui/management";

const resultOptions: { value: AuditFilters["result"]; label: string }[] = [
	{ value: "all", label: "Все результаты" },
	{ value: "success", label: "Успех" },
	{ value: "failure", label: "Отказ" },
];

const contextFields = [
	["warehouse_id", "ID склада"],
	["order_id", "ID заказа"],
	["actor_id", "ID пользователя"],
	["event_type", "Код события"],
	["correlation_id", "ID операции"],
] as const;

const areaOptions = [
	{ value: "", label: "Все разделы" },
	{ value: "inbound", label: auditAreaLabels.inbound },
	{ value: "outbound", label: auditAreaLabels.outbound },
	{ value: "map", label: auditAreaLabels.map },
	{ value: "orders", label: auditAreaLabels.orders },
	{ value: "access", label: auditAreaLabels.access },
	{ value: "system", label: auditAreaLabels.system },
];

export function AuditToolbar({
	filters,
	onChange,
	canExport,
	onExport,
}: {
	filters: AuditFilters;
	onChange: (filters: AuditFilters) => void;
	canExport: boolean;
	onExport: () => void;
}) {
	const { search, result, from, to } = filters;
	const activeFilters =
		Number(result !== "all") +
		Number(Boolean(from)) +
		Number(Boolean(to)) +
		Number(Boolean(filters.area)) +
		contextFields.filter(([key]) => Boolean(filters[key]?.trim())).length;

	function handleSearch(search: string) {
		onChange({ ...filters, search });
	}

	function handleResult(value: string) {
		const option = resultOptions.find((option) => option.value === value);

		if (option) onChange({ ...filters, result: option.value });
	}

	function handleFrom(from: string) {
		onChange({ ...filters, from });
	}

	function handleTo(to: string) {
		onChange({ ...filters, to });
	}

	function handleArea(area: string) {
		onChange({ ...filters, area });
	}

	function handleContextChange(event: ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.currentTarget;

		onChange({ ...filters, [name]: value });
	}

	function handleReset() {
		onChange({ ...defaultAuditFilters, search });
	}

	return (
		<div className={styles.toolbar}>
			<ListFilters
				search={{
					"aria-label": "Поиск по аудиту",
					value: search,
					onChange: handleSearch,
				}}
				count={activeFilters}
				onReset={handleReset}
			>
				<Select
					aria-label="Результат события"
					value={result}
					onValueChange={handleResult}
					options={resultOptions}
				/>
				<DateRangeFields
					from={from}
					to={to}
					onFromChange={handleFrom}
					onToChange={handleTo}
				/>
				<Select
					aria-label="Раздел аудита"
					value={filters.area ?? ""}
					onValueChange={handleArea}
					options={areaOptions}
				/>
				{contextFields.map(([key, label]) => (
					<Field key={key} label={label}>
						<Input
							name={key}
							value={filters[key] ?? ""}
							onChange={handleContextChange}
						/>
					</Field>
				))}
			</ListFilters>
			<Button variant="default" disabled={!canExport} onClick={onExport}>
				Скачать аудит в CSV
			</Button>
		</div>
	);
}
