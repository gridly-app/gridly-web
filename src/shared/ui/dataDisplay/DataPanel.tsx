import type { ReactNode } from "react";
import { Card, CardPanel } from "../spaceui/card";
import { Empty, EmptyDescription } from "../spaceui/empty";
import { ScrollArea } from "../spaceui/scroll-area";
import { Toolbar } from "../spaceui/toolbar";
import styles from "./DataPanel.module.css";
export interface DataPanelProps {
	toolbar: ReactNode;
	children: ReactNode;
	empty?: boolean | undefined;
	emptyMessage?: ReactNode | undefined;
}
export function DataPanel({
	toolbar,
	children,
	empty = false,
	emptyMessage = "Пока нет данных. Создайте первую запись с помощью кнопки выше.",
}: DataPanelProps) {
	return (
		<Card className={styles.panel}>
			<Toolbar className={styles.toolbar} aria-label="Действия и фильтры">
				{toolbar}
			</Toolbar>
			<ScrollArea className={styles.scrollArea}>
				<CardPanel className={styles.body}>
					{children}
					{empty && (
						<Empty>
							<EmptyDescription>{emptyMessage}</EmptyDescription>
						</Empty>
					)}
				</CardPanel>
			</ScrollArea>
		</Card>
	);
}
