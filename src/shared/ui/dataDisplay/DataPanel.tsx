import type { ReactNode } from "react";
import feedbackStyles from "../feedback/Feedback.module.css";
import panelStyles from "./DataPanel.module.css";

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
		<div className={`${panelStyles.panel} ${panelStyles.dataPanel}`}>
			<div className={panelStyles.tableToolbar}>{toolbar}</div>
			<div className={panelStyles.tableScroll}>
				{children}
				{empty && <div className={feedbackStyles.empty}>{emptyMessage}</div>}
			</div>
		</div>
	);
}
