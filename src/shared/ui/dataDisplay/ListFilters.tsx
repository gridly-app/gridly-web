import { Popover } from "@base-ui/react/popover";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "../controls/Button";
import { SearchField, type SearchFieldProps } from "../forms/SearchField";
import styles from "./ListFilters.module.css";

export function ListFilters({
	search,
	count,
	onReset,
	children,
}: {
	search: SearchFieldProps;
	count: number;
	onReset: () => void;
	children: ReactNode;
}) {
	return (
		<SearchField
			{...search}
			actions={
				<Popover.Root>
					<Popover.Trigger
						render={<Button variant="ghost" size="sm" />}
						aria-label={count ? `Фильтры, активно: ${count}` : "Фильтры"}
					>
						<IconAdjustmentsHorizontal size={16} />
						<span>Фильтры</span>
						{count > 0 && <span className={styles.count}>{count}</span>}
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Positioner
							sideOffset={8}
							align="end"
							collisionPadding={12}
							className={styles.positioner}
						>
							<Popover.Popup className={styles.fields}>
								<Popover.Title>Фильтры</Popover.Title>
								{children}
								{count > 0 && (
									<Button variant="ghost" onClick={onReset}>
										Сбросить фильтры
									</Button>
								)}
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			}
		/>
	);
}
