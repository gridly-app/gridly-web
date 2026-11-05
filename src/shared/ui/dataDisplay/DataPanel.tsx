import type { ReactNode } from "react";
import { Card, CardPanel } from "../spaceui/card";
import { Empty, EmptyDescription } from "../spaceui/empty";
import { ScrollArea } from "../spaceui/scroll-area";
import { Toolbar } from "../spaceui/toolbar";
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
		<Card className="data-panel min-w-0 min-h-0 flex-1">
			<Toolbar
				className="data-panel-toolbar flex-wrap border-0 p-4"
				aria-label="Действия и фильтры"
			>
				{toolbar}
			</Toolbar>
			<ScrollArea className="min-h-0 flex-1">
				<CardPanel className="data-panel-body min-w-0">
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
