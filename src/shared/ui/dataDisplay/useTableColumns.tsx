import { IconColumns } from "@tabler/icons-react";
import { useState } from "react";
import { readPreference, writePreference } from "@/shared/lib";
import { Button } from "../controls/Button";
import { Menu, MenuCheckboxItem, MenuPopup, MenuTrigger } from "../overlays";

export function useTableColumns(table: string, labels: readonly string[]) {
	const { visibleColumns, button } = useTableColumnVisibility(
		`gridly.table.${table}.hiddenColumns`,
		labels.map((label) => ({ key: label, label })),
		"hidden",
	);
	return {
		hiddenColumns: labels.flatMap((label, index) =>
			visibleColumns.includes(label) ? [] : [index + 1],
		),
		button,
	};
}

export function useTableColumnVisibility<Key extends string>(
	preference: string,
	columns: readonly { key: Key; label: string }[],
	stored: "visible" | "hidden",
) {
	const storeVisible = stored === "visible";
	const [storedColumns, setStoredColumns] = useState(() => {
		const keys = columns.map(({ key }) => key);
		const saved = readPreference(preference, storeVisible ? keys.join(",") : "")
			.split(",")
			.filter(Boolean);
		return storeVisible ? keys.filter((key) => saved.includes(key)) : saved;
	});
	const visibleColumns = columns.flatMap(({ key }) =>
		storedColumns.includes(key) === storeVisible ? [key] : [],
	);
	function setVisible(key: Key, visible: boolean) {
		const next =
			visible === storeVisible
				? [...storedColumns, key]
				: storedColumns.filter((storedKey) => storedKey !== key);
		writePreference(preference, next.join(","));
		setStoredColumns(next);
	}
	return {
		visibleColumns,
		button: (
			<Menu>
				<MenuTrigger render={<Button variant="secondary" size="sm" />}>
					<IconColumns size={16} /> Столбцы
				</MenuTrigger>
				<MenuPopup align="end">
					{columns
						.filter(({ label }) => label)
						.map(({ key, label }) => (
							<MenuCheckboxItem
								key={key}
								checked={visibleColumns.includes(key)}
								closeOnClick={false}
								onCheckedChange={(checked) => setVisible(key, checked)}
							>
								{label}
							</MenuCheckboxItem>
						))}
				</MenuPopup>
			</Menu>
		),
	};
}
