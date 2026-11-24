import { IconRefresh } from "@tabler/icons-react";

import { Button } from "@/shared/ui/controls";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { DateRangeFields } from "@/shared/ui/forms";

import { managementStyles as styles } from "@/shared/ui/management";

export function SystemToolbar({
	search,
	from,
	to,
	timeZone,
	isRefreshDisabled,
	onSearchChange,
	onFromChange,
	onToChange,
	onRefresh,
}: {
	search: string;
	from: string;
	to: string;
	timeZone: string | undefined;
	isRefreshDisabled: boolean;
	onSearchChange: (search: string) => void;
	onFromChange: (from: string) => void;
	onToChange: (to: string) => void;
	onRefresh: () => void;
}) {
	const activeFilters = Number(Boolean(from)) + Number(Boolean(to));

	function handleResetDates() {
		onFromChange("");
		onToChange("");
	}

	return (
		<div className={styles.toolbar}>
			<ListFilters
				search={{
					"aria-label": "Поиск по диагностике",
					value: search,
					onChange: onSearchChange,
				}}
				count={activeFilters}
				onReset={handleResetDates}
			>
				<p className={styles.subtle}>
					Часовой пояс дат: {timeZone ?? "Пояс склада пока недоступен"}.
					Конечная дата включена целиком.
				</p>
				<DateRangeFields
					from={from}
					to={to}
					onFromChange={onFromChange}
					onToChange={onToChange}
				/>
			</ListFilters>
			<Button
				variant="default"
				disabled={isRefreshDisabled}
				onClick={onRefresh}
			>
				<IconRefresh size={16} aria-hidden="true" /> Обновить
			</Button>
		</div>
	);
}
