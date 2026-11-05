import { IconColumns } from "@tabler/icons-react";
import { useState } from "react";
import { readPreference, writePreference } from "@/shared/lib/browserStorage";
import { Button } from "../controls/Button";
import {
	Menu,
	MenuCheckboxItem,
	MenuPopup,
	MenuTrigger,
} from "../overlays/Menu";

export function useTableColumns(table: string, labels: readonly string[]) {
	const preference = `gridly.table.${table}.hiddenColumns`;
	const [hidden, setHidden] = useState(() =>
		readPreference(preference, "").split(",").filter(Boolean),
	);
	return {
		hiddenColumns: labels.flatMap((label, index) =>
			hidden.includes(label) ? [index + 1] : [],
		),
		button: (
			<Menu>
				<MenuTrigger render={<Button variant="secondary" size="sm" />}>
					<IconColumns size={16} /> Столбцы
				</MenuTrigger>
				<MenuPopup align="end">
					{labels.filter(Boolean).map((label) => (
						<MenuCheckboxItem
							key={label}
							checked={!hidden.includes(label)}
							closeOnClick={false}
							onCheckedChange={(checked) => {
								const next = checked
									? hidden.filter((item) => item !== label)
									: [...hidden, label];
								writePreference(preference, next.join(","));
								setHidden(next);
							}}
						>
							{label}
						</MenuCheckboxItem>
					))}
				</MenuPopup>
			</Menu>
		),
	};
}
