import {
	type AuditFilters,
	defaultAuditFilters,
} from "../../model/auditFilters";

import { Button } from "@/shared/ui/controls";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Select } from "@/shared/ui/forms";

import { managementStyles as styles } from "@/shared/ui/management";

const resultOptions: { value: AuditFilters["result"]; label: string }[] = [
	{ value: "all", label: "Все результаты" },
	{ value: "success", label: "Успех" },
	{ value: "failure", label: "Отказ" },
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
		Number(result !== "all") + Number(Boolean(from)) + Number(Boolean(to));

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
			</ListFilters>
			<Button variant="default" disabled={!canExport} onClick={onExport}>
				Скачать аудит в CSV
			</Button>
		</div>
	);
}
